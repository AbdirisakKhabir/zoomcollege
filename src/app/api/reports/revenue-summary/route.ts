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
  monthsInRange,
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
      defaultReportDateRange("year")
    );
    if ("error" in range) {
      return NextResponse.json({ error: range.error }, { status: 400 });
    }

    const classWhere: Prisma.ClassWhereInput = {};
    const scope = getDepartmentScope(
      ctx,
      parseDepartmentIdParam(searchParams.get("departmentId"))
    );
    if (scope.kind === "none") return departmentScopeForbiddenResponse();
    if (scope.kind === "one") classWhere.departmentId = scope.departmentId;
    if (scope.kind === "many") classWhere.departmentId = { in: scope.departmentIds };

    const paymentDateRange = { gte: range.start, lte: range.end };
    const periodMonths = monthsInRange(range.dateFrom, range.dateTo);

    const classes = await prisma.class.findMany({
      where: classWhere,
      include: {
        department: { select: { id: true, name: true, code: true } },
        students: {
          where: { status: "Admitted" },
          include: {
            monthlyFeePayments: {
              where: { paymentDate: paymentDateRange },
              select: { amount: true },
            },
            tuitionPayments: {
              where: { paymentDate: paymentDateRange },
              select: { amount: true },
            },
          },
        },
      },
      orderBy: [{ departmentId: "asc" }, { name: "asc" }],
    });

    const rows = classes.map((cls) => {
      let targetRevenue = 0;
      let amountCollected = 0;

      for (const s of cls.students) {
        const expectedMonthly = computeMonthlyInvoiceAmount(s.fee, s.paymentStatus);
        targetRevenue += expectedMonthly * periodMonths;
        amountCollected += s.monthlyFeePayments.reduce((sum, p) => sum + p.amount, 0);
        amountCollected += s.tuitionPayments.reduce((sum, p) => sum + p.amount, 0);
      }

      return {
        id: cls.id,
        name: cls.name,
        department: cls.department,
        studentCount: cls.students.length,
        targetRevenue: Math.round(targetRevenue * 100) / 100,
        amountCollected: Math.round(amountCollected * 100) / 100,
        variance: Math.round((amountCollected - targetRevenue) * 100) / 100,
      };
    });

    const totalTarget = rows.reduce((s, r) => s + r.targetRevenue, 0);
    const totalCollected = rows.reduce((s, r) => s + r.amountCollected, 0);

    return NextResponse.json({
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      classes: rows,
      summary: {
        classCount: rows.length,
        totalStudents: rows.reduce((s, r) => s + r.studentCount, 0),
        totalTargetRevenue: Math.round(totalTarget * 100) / 100,
        totalAmountCollected: Math.round(totalCollected * 100) / 100,
        totalVariance: Math.round((totalCollected - totalTarget) * 100) / 100,
      },
    });
  } catch (e) {
    console.error("Revenue summary report error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
