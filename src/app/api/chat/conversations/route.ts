import { NextRequest, NextResponse } from "next/server";
import { loadAuthContext } from "@/lib/department-access";
import {
  chatUserSelect,
  findOrCreateConversation,
} from "@/lib/chat";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ userOneId: ctx.userId }, { userTwoId: ctx.userId }],
      },
      include: {
        userOne: { select: chatUserSelect },
        userTwo: { select: chatUserSelect },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, body: true, senderId: true, createdAt: true },
        },
        reads: { where: { userId: ctx.userId }, select: { lastReadAt: true } },
      },
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    });

    const items = await Promise.all(
      conversations.map(async (conv) => {
        const other =
          conv.userOneId === ctx.userId ? conv.userTwo : conv.userOne;
        const lastMessage = conv.messages[0] ?? null;
        const lastReadAt = conv.reads[0]?.lastReadAt ?? null;
        const unreadCount = await prisma.chatMessage.count({
          where: {
            conversationId: conv.id,
            senderId: { not: ctx.userId },
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        });

        return {
          id: conv.id,
          otherUser: other,
          lastMessage,
          unreadCount,
          lastMessageAt: conv.lastMessageAt,
        };
      })
    );

    return NextResponse.json(items);
  } catch (e) {
    console.error("List conversations error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const targetUserId = Number(body.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: "Valid userId is required" }, { status: 400 });
    }
    if (targetUserId === ctx.userId) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id: targetUserId, isActive: true },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const conversation = await findOrCreateConversation(ctx.userId, targetUserId);
    const other = conversation.userOneId === ctx.userId ? conversation.userTwo : conversation.userOne;

    return NextResponse.json({
      id: conversation.id,
      otherUser: other,
      unreadCount: 0,
      lastMessage: null,
      lastMessageAt: conversation.lastMessageAt,
    });
  } catch (e) {
    console.error("Create conversation error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
