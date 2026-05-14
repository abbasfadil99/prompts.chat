import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { getConfig } from "@/lib/config";
import { RateLimiter } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });
const limiter = new RateLimiter({ max: 3, windowSeconds: 600 }); // 3 per 10 min

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "anon";
  const check = limiter.check(ip);
  if (!check.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const { email } = parsed.data;

  // Always return success to prevent email enumeration
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, name: true, email: true, password: true },
  });

  if (user && user.password) {
    // Only send reset for credentials-based accounts (has password)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate old tokens
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

    await db.passwordResetToken.create({
      data: { token, userId: user.id, expires },
    });

    const config = await getConfig();
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://prompts.chat";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const { subject, html, text } = passwordResetEmail({
      name: user.name ?? email,
      resetUrl,
      appName: config.branding.name,
    });

    await sendEmail({ to: user.email, subject, html, text });
  }

  return NextResponse.json({
    message: "If an account with that email exists, a reset link has been sent.",
  });
}
