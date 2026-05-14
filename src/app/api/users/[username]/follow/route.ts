import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST — follow a user
export async function POST(_: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await params;
  const target = await db.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === session.user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  await db.follow.upsert({
    where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
    create: { followerId: session.user.id, followingId: target.id },
    update: {},
  });

  return NextResponse.json({ following: true });
}

// DELETE — unfollow a user
export async function DELETE(_: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await params;
  const target = await db.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await db.follow.deleteMany({
    where: { followerId: session.user.id, followingId: target.id },
  });

  return NextResponse.json({ following: false });
}

// GET — check follow status + counts
export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  const { username } = await params;

  const target = await db.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [followersCount, followingCount, isFollowing] = await Promise.all([
    db.follow.count({ where: { followingId: target.id } }),
    db.follow.count({ where: { followerId: target.id } }),
    session?.user
      ? db.follow.count({
          where: { followerId: session.user.id, followingId: target.id },
        })
      : Promise.resolve(0),
  ]);

  return NextResponse.json({ followersCount, followingCount, isFollowing: isFollowing > 0 });
}
