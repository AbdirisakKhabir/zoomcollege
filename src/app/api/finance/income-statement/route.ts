import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  defaultReportDateRange,
  parseReportDateRangeFromSearchParams,
} from "@/lib/report-date-range";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
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

    const paymentDateRange = { gte: range.start, lte: range.end };

    const [registrationRevenue, monthlyFeeRevenue] = await Promise.all([
      prisma.tuitionPayment.aggregate({
        where: { paymentDate: paymentDateRange },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.studentMonthlyPayment.aggregate({
        where: { paymentDate: paymentDateRange },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const approvedExpenses = await prisma.expense.aggregate({
      where: {
        status: "approved",
        approvedAt: paymentDateRange,
      },
      _sum: { amount: true },
      _count: true,
    });

    const withdrawals = await prisma.bankWithdrawal.aggregate({
      where: {
        withdrawnAt: paymentDateRange,
      },
      _sum: { amount: true },
      _count: true,
    });

    const registrationAmt = registrationRevenue._sum.amount ?? 0;
    const monthlyFeeAmt = monthlyFeeRevenue._sum.amount ?? 0;
    const totalRevenue = registrationAmt + monthlyFeeAmt;
    const totalExpenses = (approvedExpenses._sum.amount ?? 0) + (withdrawals._sum.amount ?? 0);
    const netIncome = totalRevenue - totalExpenses;

    const expensesByCategory = await prisma.expense.groupBy({
      by: ["category"],
      where: {
        status: "approved",
        approvedAt: paymentDateRange,
      },
      _sum: { amount: true },
      _count: true,
    });

    const expenseCategories = expensesByCategory.map((e) => ({
      category: e.category || "Uncategorized",
      amount: e._sum.amount ?? 0,
      count: e._count,
    }));

    return NextResponse.json({
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      revenue: {
        registrationFee: registrationAmt,
        monthlyFee: monthlyFeeAmt,
        total: totalRevenue,
        registrationPaymentCount: registrationRevenue._count,
        monthlyPaymentCount: monthlyFeeRevenue._count,
        paymentCount: registrationRevenue._count + monthlyFeeRevenue._count,
      },
      expenses: {
        approvedExpenses: approvedExpenses._sum.amount ?? 0,
        approvedCount: approvedExpenses._count,
        withdrawals: withdrawals._sum.amount ?? 0,
        withdrawalCount: withdrawals._count,
        total: totalExpenses,
      },
      expenseCategories,
      netIncome,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Income statement error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
