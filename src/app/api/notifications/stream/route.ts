import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Poll interval in ms — how often we check for new notifications
const POLL_INTERVAL = 15_000;
// Max connection lifetime (Vercel function timeout safety)
const MAX_LIFETIME = 55_000;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      // Send initial payload immediately
      const initial = await getNotificationSummary(userId);
      send(initial);

      // Poll for updates
      let elapsed = 0;
      const interval = setInterval(async () => {
        elapsed += POLL_INTERVAL;
        if (elapsed >= MAX_LIFETIME) {
          // Send close signal so the client reconnects
          send({ type: "close" });
          clearInterval(interval);
          controller.close();
          return;
        }
        const payload = await getNotificationSummary(userId);
        send(payload);
      }, POLL_INTERVAL);

      // Cleanup if the client drops
      return () => clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

async function getNotificationSummary(userId: string) {
  const [pendingChangeRequests, commentNotifications] = await Promise.all([
    db.changeRequest.count({
      where: { status: "PENDING", prompt: { authorId: userId } },
    }),
    db.notification.findMany({
      where: { userId, read: false, type: { in: ["COMMENT", "REPLY"] } },
      include: {
        actor: { select: { id: true, name: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const promptIds = [...new Set(commentNotifications.map((n) => n.promptId).filter(Boolean))] as string[];
  const prompts = promptIds.length
    ? await db.prompt.findMany({
        where: { id: { in: promptIds } },
        select: { id: true, title: true },
      })
    : [];
  const promptMap = new Map(prompts.map((p) => [p.id, p.title]));

  return {
    type: "update",
    pendingChangeRequests,
    unreadComments: commentNotifications.length,
    commentNotifications: commentNotifications.map((n) => ({
      id: n.id,
      type: n.type,
      createdAt: n.createdAt,
      actor: n.actor,
      promptId: n.promptId,
      promptTitle: n.promptId ? (promptMap.get(n.promptId) ?? null) : null,
    })),
  };
}
