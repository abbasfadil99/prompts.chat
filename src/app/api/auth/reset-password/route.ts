import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { id: true } } },
  });

  if (!resetToken || resetToken.used || resetToken.expires < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: { password: hashed },
    }),
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    }),
    // Invalidate all sessions so the user must re-login
    db.session.deleteMany({ where: { userId: resetToken.userId } }),
  ]);

  return NextResponse.json({ message: "Password updated successfully." });
}

// GET — validate token before showing the form
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false });

  const resetToken = await db.passwordResetToken.findUnique({ where: { token } });
  const valid = !!resetToken && !resetToken.used && resetToken.expires > new Date();
  return NextResponse.json({ valid });
}
