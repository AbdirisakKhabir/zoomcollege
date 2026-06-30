import { NextRequest, NextResponse } from "next/server";
import {
  applyDepartmentScope,
  departmentScopeForbiddenResponse,
  getDepartmentScope,
  loadAuthContext,
  parseDepartmentIdParam,
} from "@/lib/department-access";
import { computeMonthlyInvoiceAmount } from "@/lib/monthly-fee";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const SCHOLARSHIP_STATUSES = ["Full Scholarship", "Half Scholar"];

export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classIdRaw = searchParams.get("classId");
    const statusFilter = searchParams.get("status")?.trim() || "";

    const where: Prisma.StudentWhereInput = {
      status: "Admitted",
      paymentStatus: {
        in:
          statusFilter && SCHOLARSHIP_STATUSES.includes(statusFilter)
            ? [statusFilter]
            : SCHOLARSHIP_STATUSES,
      },
    };

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
        department: { select: { id: true, name: true, code: true, registrationFee: true } },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ paymentStatus: "asc" }, { studentId: "asc" }],
    });

    const rows = students.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      firstName: s.firstName,
      lastName: s.lastName,
      phone: s.phone,
      email: s.email,
      gender: s.gender,
      paymentStatus: s.paymentStatus,
      balance: s.balance ?? 0,
      department: s.department,
      class: s.class,
      monthlyFee: computeMonthlyInvoiceAmount(s.fee, s.paymentStatus),
      monthlyFeeBase: s.fee ?? 0,
    }));

    const byStatus = rows.reduce(
      (acc, r) => {
        acc[r.paymentStatus] = (acc[r.paymentStatus] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      students: rows,
      summary: {
        total: rows.length,
        byStatus,
        fullScholarship: byStatus["Full Scholarship"] || 0,
        halfScholar: byStatus["Half Scholar"] || 0,
      },
    });
  } catch (e) {
    console.error("Scholarship report error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
