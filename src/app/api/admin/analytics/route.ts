import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function getDaysBefore(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const thirtyDaysAgo = getDaysBefore(30);

  // Fetch daily prompt and user counts for last 30 days in parallel
  const [promptsByDay, usersByDay, topCategories, promptTypeBreakdown, totalVotes, totalViews] =
    await Promise.all([
      // Prompts created per day (last 30 days)
      db.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT DATE("createdAt") as day, COUNT(*) as count
        FROM prompts
        WHERE "createdAt" >= ${thirtyDaysAgo}
          AND "deletedAt" IS NULL
        GROUP BY DATE("createdAt")
        ORDER BY day ASC
      `,

      // Users registered per day (last 30 days)
      db.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT DATE("createdAt") as day, COUNT(*) as count
        FROM users
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY day ASC
      `,

      // Top 10 categories by prompt count
      db.category.findMany({
        where: { parentId: null },
        select: {
          name: true,
          _count: { select: { prompts: true } },
        },
        orderBy: { prompts: { _count: "desc" } },
        take: 10,
      }),

      // Prompt type breakdown
      db.prompt.groupBy({
        by: ["type"],
        where: { deletedAt: null },
        _count: { type: true },
      }),

      // Total votes
      db.promptVote.count(),

      // Total views (sum of viewCount)
      db.prompt.aggregate({ _sum: { viewCount: true } }),
    ]);

  // Build a complete 30-day date series filling zeros for missing days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const promptMap = new Map(promptsByDay.map((r) => [r.day.toString().slice(0, 10), Number(r.count)]));
  const userMap = new Map(usersByDay.map((r) => [r.day.toString().slice(0, 10), Number(r.count)]));

  const dailyData = days.map((day) => ({
    day,
    prompts: promptMap.get(day) ?? 0,
    users: userMap.get(day) ?? 0,
  }));

  return NextResponse.json({
    dailyData,
    topCategories: topCategories.map((c) => ({
      name: c.name,
      count: c._count.prompts,
    })),
    promptTypeBreakdown: promptTypeBreakdown.map((r) => ({
      type: r.type,
      count: r._count.type,
    })),
    totals: {
      votes: totalVotes,
      views: totalViews._sum.viewCount ?? 0,
    },
  });
}
