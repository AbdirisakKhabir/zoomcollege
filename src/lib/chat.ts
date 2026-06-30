import { prisma } from "@/lib/prisma";

export { formatRelativeTime, userDisplayName, userInitials } from "@/lib/chat-utils";

export function orderedUserPair(userIdA: number, userIdB: number): [number, number] {
  return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
}

export function isConversationParticipant(
  conversation: { userOneId: number; userTwoId: number },
  userId: number
): boolean {
  return conversation.userOneId === userId || conversation.userTwoId === userId;
}

export function otherParticipantId(
  conversation: { userOneId: number; userTwoId: number },
  userId: number
): number {
  return conversation.userOneId === userId ? conversation.userTwoId : conversation.userOneId;
}

export const chatUserSelect = {
  id: true,
  name: true,
  email: true,
  role: { select: { name: true } },
} as const;

export async function findOrCreateConversation(userIdA: number, userIdB: number) {
  if (userIdA === userIdB) {
    throw new Error("Cannot start a conversation with yourself");
  }

  const [userOneId, userTwoId] = orderedUserPair(userIdA, userIdB);

  return prisma.conversation.upsert({
    where: { userOneId_userTwoId: { userOneId, userTwoId } },
    create: { userOneId, userTwoId },
    update: {},
    include: {
      userOne: { select: chatUserSelect },
      userTwo: { select: chatUserSelect },
    },
  });
}

export async function getLastReadAt(conversationId: number, userId: number): Promise<Date | null> {
  const row = await prisma.conversationRead.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { lastReadAt: true },
  });
  return row?.lastReadAt ?? null;
}

export async function markConversationRead(conversationId: number, userId: number) {
  const now = new Date();
  await prisma.conversationRead.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    create: { conversationId, userId, lastReadAt: now },
    update: { lastReadAt: now },
  });
}

export async function countUnreadForUser(userId: number): Promise<number> {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userOneId: userId }, { userTwoId: userId }] },
    select: {
      id: true,
      reads: { where: { userId }, select: { lastReadAt: true } },
    },
  });

  let total = 0;
  for (const conv of conversations) {
    const lastReadAt = conv.reads[0]?.lastReadAt ?? null;
    const count = await prisma.chatMessage.count({
      where: {
        conversationId: conv.id,
        senderId: { not: userId },
        ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
      },
    });
    total += count;
  }
  return total;
}
