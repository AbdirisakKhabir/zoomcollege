import { NextRequest, NextResponse } from "next/server";
import {
  applyDepartmentScope,
  assertDepartmentAccess,
  departmentScopeForbiddenResponse,
  getDepartmentScope,
  loadAuthContext,
  parseDepartmentIdParam,
} from "@/lib/department-access";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function parseDateEnd(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

function parseDateStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** GET — students with absent attendance counts in the date range. */
export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");
    const classIdRaw = searchParams.get("classId");
    const dateFrom = searchParams.get("dateFrom")?.trim();
    const dateTo = searchParams.get("dateTo")?.trim();
    const minAbsentDays = Math.max(1, Number(searchParams.get("minAbsentDays") || 1));

    const studentWhere: Prisma.StudentWhereInput = {
      status: "Admitted",
    };

    const scope = getDepartmentScope(ctx, parseDepartmentIdParam(departmentId));
    if (scope.kind === "none") return departmentScopeForbiddenResponse();
    applyDepartmentScope(studentWhere, scope);

    if (classIdRaw) {
      const classId = Number(classIdRaw);
      if (Number.isInteger(classId) && classId > 0) studentWhere.classId = classId;
    }

    const sessionWhere: Prisma.AttendanceSessionWhereInput = {};
    if (departmentId) {
      sessionWhere.class = { departmentId: Number(departmentId) };
    }
    if (classIdRaw) {
      sessionWhere.classId = Number(classIdRaw);
    }
    if (dateFrom || dateTo) {
      sessionWhere.date = {};
      if (dateFrom) sessionWhere.date.gte = parseDateStart(dateFrom);
      if (dateTo) sessionWhere.date.lte = parseDateEnd(dateTo);
    }

    const absentRecords = await prisma.attendanceRecord.findMany({
      where: {
        status: "Absent",
        student: studentWhere,
        session: sessionWhere,
      },
      select: {
        studentId: true,
        session: { select: { date: true } },
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            department: { select: { id: true, name: true, code: true } },
            class: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const byStudent = new Map<
      number,
      {
        student: (typeof absentRecords)[0]["student"];
        absentDates: Set<string>;
      }
    >();

    for (const rec of absentRecords) {
      const dateKey = rec.session.date.toISOString().slice(0, 10);
      const existing = byStudent.get(rec.studentId);
      if (existing) {
        existing.absentDates.add(dateKey);
      } else {
        byStudent.set(rec.studentId, {
          student: rec.student,
          absentDates: new Set([dateKey]),
        });
      }
    }

    const students = [...byStudent.values()]
      .map(({ student, absentDates }) => ({
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        status: student.status,
        department: student.department,
        class: student.class,
        absentDays: absentDates.size,
      }))
      .filter((s) => s.absentDays >= minAbsentDays)
      .sort((a, b) => b.absentDays - a.absentDays || a.studentId.localeCompare(b.studentId));

    return NextResponse.json({
      students,
      summary: {
        count: students.length,
        totalAbsentDays: students.reduce((sum, s) => sum + s.absentDays, 0),
        minAbsentDays,
      },
      filters: { dateFrom: dateFrom || null, dateTo: dateTo || null },
    });
  } catch (e) {
    console.error("Absent attendance report error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/** POST — mark selected students as Inactive. Body: { studentIds: number[] } */
export async function POST(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const studentIds = (body.studentIds as unknown[])
      ?.map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (!studentIds?.length) {
      return NextResponse.json({ error: "studentIds array is required" }, { status: 400 });
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, departmentId: true, status: true },
    });

    if (students.length === 0) {
      return NextResponse.json({ error: "No matching students found" }, { status: 404 });
    }

    for (const s of students) {
      const denied = assertDepartmentAccess(ctx, s.departmentId);
      if (denied) return denied;
    }

    const result = await prisma.student.updateMany({
      where: { id: { in: students.map((s) => s.id) } },
      data: { status: "Inactive" },
    });

    return NextResponse.json({
      updated: result.count,
      message: `${result.count} student(s) marked as Inactive`,
    });
  } catch (e) {
    console.error("Mark inactive error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
