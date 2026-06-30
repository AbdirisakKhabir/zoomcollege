import { NextRequest, NextResponse } from "next/server";
import { loadAuthContext } from "@/lib/department-access";
import { chatUserSelect } from "@/lib/chat";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: ctx.userId },
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
                { role: { name: { contains: q } } },
              ],
            }
          : {}),
      },
      select: chatUserSelect,
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 50,
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error("Chat contacts error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
