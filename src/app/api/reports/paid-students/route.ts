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
import {
  defaultReportDateRange,
  formatReportDateRange,
  parseReportDateRangeFromSearchParams,
} from "@/lib/report-date-range";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = parseReportDateRangeFromSearchParams(
      searchParams,
      defaultReportDateRange("month")
    );
    if ("error" in range) {
      return NextResponse.json({ error: range.error }, { status: 400 });
    }

    const classIdRaw = searchParams.get("classId");
    const paymentDateRange = { gte: range.start, lte: range.end };

    const where: Prisma.StudentWhereInput = {
      status: "Admitted",
      monthlyFeePayments: { some: { paymentDate: paymentDateRange } },
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
            department: { select: { code: true } },
          },
        },
        monthlyFeePayments: {
          where: { paymentDate: paymentDateRange },
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            bank: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: [{ classId: "asc" }, { studentId: "asc" }],
    });

    const rows = students.map((s) => {
      const amountPaid = s.monthlyFeePayments.reduce((sum, p) => sum + p.amount, 0);
      const expectedFee = computeMonthlyInvoiceAmount(s.fee, s.paymentStatus);
      return {
        id: s.id,
        studentId: s.studentId,
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone,
        gender: s.gender,
        paymentStatus: s.paymentStatus,
        department: s.department,
        class: s.class,
        expectedFee,
        amountPaid,
        payments: s.monthlyFeePayments,
      };
    });

    const totalPaid = rows.reduce((sum, r) => sum + r.amountPaid, 0);
    const totalExpected = rows.reduce((sum, r) => sum + r.expectedFee, 0);

    return NextResponse.json({
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      periodLabel: formatReportDateRange(range.dateFrom, range.dateTo),
      students: rows,
      summary: {
        count: rows.length,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalExpected: Math.round(totalExpected * 100) / 100,
      },
    });
  } catch (e) {
    console.error("Paid students report error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
