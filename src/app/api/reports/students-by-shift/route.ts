import { NextRequest, NextResponse } from "next/server";
import {
  applyDepartmentScope,
  departmentScopeForbiddenResponse,
  getDepartmentScope,
  loadAuthContext,
  parseDepartmentIdParam,
} from "@/lib/department-access";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const SHIFTS = ["Morning", "Afternoon", "Evening"] as const;

function formatScheduleSlot(s: {
  dayOfWeek: string;
  shift: string;
  startTime: string;
  endTime: string;
  course: { code: string };
}): string {
  return `${s.dayOfWeek} ${s.shift} (${s.startTime}–${s.endTime}) · ${s.course.code}`;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classIdRaw = searchParams.get("classId");
    const shiftFilter = searchParams.get("shift")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "Admitted";

    const where: Prisma.StudentWhereInput = {};
    if (statusFilter && statusFilter !== "all") {
      where.status = statusFilter;
    }

    const scope = getDepartmentScope(
      ctx,
      parseDepartmentIdParam(searchParams.get("departmentId"))
    );
    if (scope.kind === "none") return departmentScopeForbiddenResponse();
    applyDepartmentScope(where, scope);

    if (classIdRaw) {
      const classId = Number(classIdRaw);
      if (Number.isInteger(classId) && classId > 0) where.classId = classId;
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        class: {
          select: {
            id: true,
            name: true,
            classSchedules: {
              select: {
                dayOfWeek: true,
                shift: true,
                startTime: true,
                endTime: true,
                course: { select: { code: true, name: true } },
              },
              orderBy: [{ dayOfWeek: "asc" }, { shift: "asc" }, { startTime: "asc" }],
            },
          },
        },
      },
      orderBy: [{ departmentId: "asc" }, { studentId: "asc" }],
    });

    let rows = students.map((s) => {
      const schedules = s.class?.classSchedules ?? [];
      const shifts = [...new Set(schedules.map((sch) => sch.shift))].sort();
      const scheduleSummary = schedules.map(formatScheduleSlot);

      return {
        id: s.id,
        studentId: s.studentId,
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone,
        gender: s.gender,
        email: s.email,
        status: s.status,
        paymentStatus: s.paymentStatus,
        department: s.department,
        class: s.class
          ? {
              id: s.class.id,
              name: s.class.name,
            }
          : null,
        shifts,
        shiftsLabel: shifts.length > 0 ? shifts.join(", ") : "—",
        scheduleSummary,
      };
    });

    if (shiftFilter && SHIFTS.includes(shiftFilter as (typeof SHIFTS)[number])) {
      rows = rows.filter((r) => r.shifts.includes(shiftFilter));
    }

    const shiftCounts = rows.reduce(
      (acc, r) => {
        for (const sh of r.shifts) {
          acc[sh] = (acc[sh] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      students: rows,
      summary: {
        count: rows.length,
        byShift: shiftCounts,
      },
    });
  } catch (e) {
    console.error("Students by shift report error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
