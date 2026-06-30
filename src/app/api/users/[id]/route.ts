import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  hasPermission,
  loadAuthContext,
  requireSuperAdmin,
} from "@/lib/department-access";
import { prisma } from "@/lib/prisma";
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
  updatedAt: true,
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(ctx, "users.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: parsedId },
      select: userSelect,
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (e) {
    console.error("Get user error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(ctx, "users.edit")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body = await req.json();
    const { email, name, roleId, isActive, password, isSuperAdmin, departmentAssignments } =
      body;

    const data: {
      email?: string;
      name?: string | null;
      roleId?: number;
      isActive?: boolean;
      isSuperAdmin?: boolean;
      password?: string;
    } = {};

    if (typeof email === "string") data.email = email.toLowerCase().trim();
    if (typeof name !== "undefined") data.name = name || null;
    if (typeof roleId !== "undefined") {
      const parsedRoleId = Number(roleId);
      if (!Number.isInteger(parsedRoleId)) {
        return NextResponse.json({ error: "Invalid roleId" }, { status: 400 });
      }
      data.roleId = parsedRoleId;
    }
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (typeof password === "string" && password.length > 0) {
      data.password = await bcrypt.hash(password, 10);
    }

    if (typeof isSuperAdmin === "boolean") {
      const denied = requireSuperAdmin(ctx);
      if (denied) return denied;
      data.isSuperAdmin = isSuperAdmin;
    }

    let assignments = normalizeDepartmentAssignments(departmentAssignments);
    if (departmentAssignments !== undefined) {
      assignments = assignments ?? [];
      if (assignments.length === 0 && !data.isSuperAdmin) {
        const existing = await prisma.user.findUnique({
          where: { id: parsedId },
          select: { isSuperAdmin: true },
        });
        const willBeSuperAdmin = data.isSuperAdmin ?? existing?.isSuperAdmin ?? false;
        if (!willBeSuperAdmin) {
          return NextResponse.json(
            { error: "Assign at least one department and role, or mark user as Super Admin" },
            { status: 400 }
          );
        }
      }
      const assignmentError = await validateDepartmentAssignments(assignments);
      if (assignmentError) {
        return NextResponse.json({ error: assignmentError }, { status: 400 });
      }
    }

    await prisma.user.update({
      where: { id: parsedId },
      data,
    });

    if (assignments !== null && departmentAssignments !== undefined) {
      await replaceUserDepartmentAssignments(parsedId, assignments);
      if (assignments.length > 0 && !data.isSuperAdmin) {
        await prisma.user.update({
          where: { id: parsedId },
          data: { roleId: assignments[0].roleId },
        });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: parsedId },
      select: userSelect,
    });
    return NextResponse.json(user);
  } catch (e) {
    console.error("Update user error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(ctx, "users.delete")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }
    if (parsedId === ctx.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }
    await prisma.user.delete({ where: { id: parsedId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete user error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
