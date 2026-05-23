import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET — return all site settings (key-value pairs from DB)
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await db.siteSettings.findMany({ orderBy: { key: "asc" } });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return NextResponse.json(map);
}

// POST — upsert site settings
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: Record<string, string> = await request.json().catch(() => ({}));
  if (typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const allowed = new Set([
    "site_name",
    "site_description",
    "maintenance_mode",
    "allow_registration",
    "max_prompts_per_day",
    "featured_banner_text",
    "featured_banner_url",
    "featured_banner_enabled",
    "contact_email",
    "announcement",
  ]);

  const ops = Object.entries(body)
    .filter(([k]) => allowed.has(k))
    .map(([key, value]) =>
      db.siteSettings.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      })
    );

  await Promise.all(ops);
  return NextResponse.json({ ok: true });
}
