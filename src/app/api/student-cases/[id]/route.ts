import { NextRequest, NextResponse } from "next/server";
import {
  assertDepartmentAccess,
  hasPermission,
  loadAuthContext,
} from "@/lib/department-access";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const caseInclude = {
  student: {
    select: {
      id: true,
      studentId: true,
      firstName: true,
      lastName: true,
      departmentId: true,
      department: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true } },
    },
  },
  recordedBy: { select: { id: true, name: true, email: true } },
} as const;

async function loadCaseWithAccess(id: number, ctx: Awaited<ReturnType<typeof loadAuthContext>>) {
  const record = await prisma.studentCase.findUnique({
    where: { id },
    include: caseInclude,
  });
  if (!record) return { error: NextResponse.json({ error: "Case not found" }, { status: 404 }) };
  if (!ctx) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const deptError = assertDepartmentAccess(ctx, record.student.departmentId);
  if (deptError) return { error: deptError };

  return { record };
}

export async function GET(req: NextRequest, routeCtx: RouteContext) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(ctx, "admission.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: rawId } = await routeCtx.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await loadCaseWithAccess(id, ctx);
    if ("error" in result && result.error) return result.error;
    return NextResponse.json(result.record);
  } catch (e) {
    console.error("Get student case error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, routeCtx: RouteContext) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(ctx, "admission.edit")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: rawId } = await routeCtx.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await loadCaseWithAccess(id, ctx);
    if ("error" in result && result.error) return result.error;

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.caseType !== undefined) data.caseType = String(body.caseType).trim();
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.description !== undefined) {
      data.description = body.description ? String(body.description).trim() : null;
    }
    if (body.caseDate !== undefined) data.caseDate = new Date(body.caseDate);
    if (body.status !== undefined) data.status = String(body.status).trim();
    if (body.resolution !== undefined) {
      data.resolution = body.resolution ? String(body.resolution).trim() : null;
    }

    if (body.studentId !== undefined) {
      const sid = Number(body.studentId);
      if (!Number.isInteger(sid) || sid <= 0) {
        return NextResponse.json({ error: "Invalid student" }, { status: 400 });
      }
      const student = await prisma.student.findUnique({
        where: { id: sid },
        select: { departmentId: true },
      });
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }
      const deptError = assertDepartmentAccess(ctx, student.departmentId);
      if (deptError) return deptError;
      data.studentId = sid;
    }

    const updated = await prisma.studentCase.update({
      where: { id },
      data,
      include: caseInclude,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Update student case error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, routeCtx: RouteContext) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(ctx, "admission.delete")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: rawId } = await routeCtx.params;
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await loadCaseWithAccess(id, ctx);
    if ("error" in result && result.error) return result.error;

    await prisma.studentCase.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete student case error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
