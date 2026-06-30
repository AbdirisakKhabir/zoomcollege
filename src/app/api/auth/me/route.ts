import { NextRequest, NextResponse } from "next/server";
import { authUserPayload, loadAuthContext } from "@/lib/department-access";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, imageUrl: true },
    });

    return NextResponse.json({
      user: {
        ...authUserPayload(ctx),
        name: user?.name ?? null,
        imageUrl: user?.imageUrl ?? null,
      },
    });
  } catch (e) {
    console.error("Me error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
