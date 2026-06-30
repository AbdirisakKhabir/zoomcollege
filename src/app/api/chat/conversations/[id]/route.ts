import { NextRequest, NextResponse } from "next/server";
import { loadAuthContext } from "@/lib/department-access";
import {
  chatUserSelect,
  isConversationParticipant,
  markConversationRead,
} from "@/lib/chat";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

async function loadConversationForUser(conversationId: number, userId: number) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      userOne: { select: chatUserSelect },
      userTwo: { select: chatUserSelect },
    },
  });
  if (!conversation) return null;
  if (!isConversationParticipant(conversation, userId)) return null;
  return conversation;
}

export async function GET(req: NextRequest, routeCtx: RouteContext) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: rawId } = await routeCtx.params;
    const conversationId = Number(rawId);
    if (!Number.isInteger(conversationId)) {
      return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
    }

    const conversation = await loadConversationForUser(conversationId, ctx.userId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const afterId = Number(searchParams.get("afterId"));
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        ...(Number.isInteger(afterId) && afterId > 0 ? { id: { gt: afterId } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: { sender: { select: chatUserSelect } },
    });

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        otherUser:
          conversation.userOneId === ctx.userId ? conversation.userTwo : conversation.userOne,
      },
      messages,
    });
  } catch (e) {
    console.error("Get messages error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, routeCtx: RouteContext) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: rawId } = await routeCtx.params;
    const conversationId = Number(rawId);
    if (!Number.isInteger(conversationId)) {
      return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
    }

    const conversation = await loadConversationForUser(conversationId, ctx.userId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const body = await req.json();
    const text = String(body.body ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: "Message is too long" }, { status: 400 });
    }

    const now = new Date();
    const [message] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          conversationId,
          senderId: ctx.userId,
          body: text,
        },
        include: { sender: { select: chatUserSelect } },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now },
      }),
      prisma.conversationRead.upsert({
        where: {
          conversationId_userId: { conversationId, userId: ctx.userId },
        },
        create: { conversationId, userId: ctx.userId, lastReadAt: now },
        update: { lastReadAt: now },
      }),
    ]);

    return NextResponse.json(message);
  } catch (e) {
    console.error("Send message error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, routeCtx: RouteContext) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: rawId } = await routeCtx.params;
    const conversationId = Number(rawId);
    if (!Number.isInteger(conversationId)) {
      return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });
    }

    const conversation = await loadConversationForUser(conversationId, ctx.userId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    await markConversationRead(conversationId, ctx.userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Mark read error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
