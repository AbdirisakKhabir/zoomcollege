import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  hasPermission,
  loadAuthContext,
  requireSuperAdmin,
} from "@/lib/department-access";
import { prisma } from "@/lib/prisma";
import { parsePaginationParams } from "@/lib/pagination";
import {
  normalizeDepartmentAssignments,
  replaceUserDepartmentAssignments,
  validateDepartmentAssignments,
} from "@/lib/user-departments";

const userSelect = {
  id: true,
  email: true,
  name: true,
  roleId: true,
  isActive: true,
  isSuperAdmin: true,
  createdAt: true,
  role: { select: { name: true } },
  departmentAssignments: {
    select: {
      departmentId: true,
      roleId: true,
      department: { select: { id: true, name: true, code: true } },
      role: { select: { id: true, name: true } },
    },
  },
} as const;

export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(ctx, "users.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const { paginate, page, pageSize, skip } = parsePaginationParams(searchParams);
    const q = searchParams.get("q")?.trim();

    const where: Prisma.UserWhereInput = {};
    if (q) {
      where.OR = [
        { email: { contains: q } },
        { name: { contains: q } },
        { role: { name: { contains: q } } },
      ];
    }

    if (paginate) {
      const [items, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          select: userSelect,
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.count({ where }),
      ]);
      return NextResponse.json({ items, total, page, pageSize });
    }

    const users = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error("Users list error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(ctx, "users.create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, name, roleId, isSuperAdmin, departmentAssignments } = body;
    const parsedRoleId = Number(roleId);
    const wantsSuperAdmin = Boolean(isSuperAdmin);

    if (!email || !password || !Number.isInteger(parsedRoleId)) {
      return NextResponse.json(
        { error: "Email, password and roleId are required" },
        { status: 400 }
      );
    }

    if (wantsSuperAdmin) {
      const denied = requireSuperAdmin(ctx);
      if (denied) return denied;
    }

    const assignments = normalizeDepartmentAssignments(departmentAssignments) ?? [];
    if (!wantsSuperAdmin && assignments.length === 0) {
      return NextResponse.json(
        { error: "Assign at least one department and role, or mark user as Super Admin" },
        { status: 400 }
      );
    }

    const assignmentError = await validateDepartmentAssignments(assignments);
    if (assignmentError) {
      return NextResponse.json({ error: assignmentError }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const effectiveRoleId = wantsSuperAdmin
      ? parsedRoleId
      : (assignments[0]?.roleId ?? parsedRoleId);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: String(email).toLowerCase().trim(),
        password: hashed,
        name: name || null,
        roleId: effectiveRoleId,
        isSuperAdmin: wantsSuperAdmin,
      },
      select: userSelect,
    });

    if (!wantsSuperAdmin && assignments.length > 0) {
      await replaceUserDepartmentAssignments(user.id, assignments);
      const refreshed = await prisma.user.findUnique({
        where: { id: user.id },
        select: userSelect,
      });
      return NextResponse.json(refreshed);
    }

    return NextResponse.json(user);
  } catch (e) {
    console.error("Create user error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
