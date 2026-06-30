import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { authUserPayload, loadAuthContextByUserId } from "@/lib/department-access";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        imageUrl: true,
        password: true,
        isActive: true,
        roleId: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const ctx = await loadAuthContextByUserId(user.id);
    if (!ctx) {
      return NextResponse.json({ error: "User account is inactive" }, { status: 401 });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
    });

    return NextResponse.json({
      token,
      user: {
        ...authUserPayload(ctx),
        name: user.name,
        imageUrl: user.imageUrl ?? null,
      },
    });
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
