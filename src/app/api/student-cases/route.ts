import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  applyDepartmentScope,
  assertDepartmentAccess,
  departmentScopeForbiddenResponse,
  getDepartmentScope,
  hasPermission,
  loadAuthContext,
  parseDepartmentIdParam,
} from "@/lib/department-access";
import { prisma } from "@/lib/prisma";

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

function buildCaseWhere(searchParams: URLSearchParams): Prisma.StudentCaseWhereInput {
  const where: Prisma.StudentCaseWhereInput = {};
  const studentWhere: Prisma.StudentWhereInput = {};

  const status = searchParams.get("status");
  if (status && status !== "all") {
    where.status = status;
  }

  const caseType = searchParams.get("caseType");
  if (caseType && caseType !== "all") {
    where.caseType = caseType;
  }

  const studentId = searchParams.get("studentId");
  if (studentId) {
    const id = Number(studentId);
    if (Number.isInteger(id) && id > 0) {
      where.studentId = id;
    }
  }

  const q = searchParams.get("q")?.trim();
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { student: { studentId: { contains: q } } },
      { student: { firstName: { contains: q } } },
      { student: { lastName: { contains: q } } },
    ];
  }

  const departmentId = searchParams.get("departmentId");
  if (departmentId && departmentId !== "all") {
    const id = Number(departmentId);
    if (Number.isInteger(id) && id > 0) {
      studentWhere.departmentId = id;
    }
  }

  if (Object.keys(studentWhere).length > 0) {
    where.student = studentWhere;
  }

  return where;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(ctx, "admission.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const where = buildCaseWhere(searchParams);
    const scope = getDepartmentScope(
      ctx,
      parseDepartmentIdParam(searchParams.get("departmentId"))
    );
    if (scope.kind === "none") return departmentScopeForbiddenResponse();

    const studentFilter =
      typeof where.student === "object" && where.student !== null
        ? { ...where.student }
        : {};
    applyDepartmentScope(studentFilter as Record<string, unknown>, scope);
    where.student = studentFilter;

    const cases = await prisma.studentCase.findMany({
      where,
      include: caseInclude,
      orderBy: [{ caseDate: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(cases);
  } catch (e) {
    console.error("Student cases list error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasPermission(ctx, "admission.create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, caseType, title, description, caseDate, status, resolution } = body;

    const sid = studentId != null ? Number(studentId) : null;
    if (!sid || !Number.isInteger(sid)) {
      return NextResponse.json({ error: "Student is required" }, { status: 400 });
    }
    if (!caseType || !String(caseType).trim()) {
      return NextResponse.json({ error: "Case type is required" }, { status: 400 });
    }
    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: sid },
      select: { id: true, departmentId: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const deptError = assertDepartmentAccess(ctx, student.departmentId);
    if (deptError) return deptError;

    const record = await prisma.studentCase.create({
      data: {
        studentId: sid,
        caseType: String(caseType).trim(),
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        caseDate: caseDate ? new Date(caseDate) : new Date(),
        status: status ? String(status).trim() : "Open",
        resolution: resolution ? String(resolution).trim() : null,
        recordedById: ctx.userId,
      },
      include: caseInclude,
    });

    return NextResponse.json(record);
  } catch (e) {
    console.error("Create student case error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
