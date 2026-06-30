import { NextRequest, NextResponse } from "next/server";
import { loadAuthContext } from "@/lib/department-access";
import { chatUserSelect, countUnreadForUser, formatRelativeTime } from "@/lib/chat";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const unreadCount = await countUnreadForUser(ctx.userId);

    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ userOneId: ctx.userId }, { userTwoId: ctx.userId }] },
      select: { id: true, reads: { where: { userId: ctx.userId }, select: { lastReadAt: true } } },
    });

    const unreadMessages = await Promise.all(
      conversations.map(async (conv) => {
        const lastReadAt = conv.reads[0]?.lastReadAt ?? null;
        return prisma.chatMessage.findMany({
          where: {
            conversationId: conv.id,
            senderId: { not: ctx.userId },
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            sender: { select: chatUserSelect },
            conversation: { select: { id: true } },
          },
        });
      })
    );

    const items = unreadMessages
      .flat()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 15)
      .map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        relativeTime: formatRelativeTime(m.createdAt),
        sender: m.sender,
      }));

    return NextResponse.json({ unreadCount, items });
  } catch (e) {
    console.error("Chat notifications error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
