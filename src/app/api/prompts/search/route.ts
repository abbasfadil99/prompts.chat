import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
  const ownerOnly = searchParams.get("ownerOnly") === "true";
  const searchIn = searchParams.get("searchIn") || "title"; // "title" | "all"

  if (query.length < 2) {
    return NextResponse.json({ prompts: [] });
  }

  const session = await auth();

  try {
    // Handle comma-separated keywords for title-only search
    const keywords = query.split(",").map((k) => k.trim()).filter(Boolean);
    const multiKeyword = keywords.length > 1;

    // Build per-field match conditions
    const buildFieldConditions = (field: "title" | "description" | "content") =>
      multiKeyword
        ? keywords.map((kw) => ({ [field]: { contains: kw, mode: "insensitive" as const } }))
        : [{ [field]: { contains: query, mode: "insensitive" as const } }];

    const titleConditions = buildFieldConditions("title");

    // When searching across all fields combine title / description / content
    const fullTextConditions =
      searchIn === "all"
        ? [
            ...titleConditions,
            ...buildFieldConditions("description"),
            ...buildFieldConditions("content"),
          ]
        : titleConditions;

    const visibilityFilter =
      ownerOnly && session?.user
        ? { authorId: session.user.id }
        : {
            OR: [
              { isPrivate: false },
              ...(session?.user ? [{ authorId: session.user.id }] : []),
            ],
          };

    const prompts = await db.prompt.findMany({
      where: {
        deletedAt: null,
        isUnlisted: false,
        AND: [
          visibilityFilter,
          { OR: fullTextConditions },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        type: true,
        author: {
          select: { username: true },
        },
        _count: {
          select: { votes: true },
        },
      },
      take: limit,
      orderBy: [
        { isFeatured: "desc" },
        { viewCount: "desc" },
      ],
    });

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
