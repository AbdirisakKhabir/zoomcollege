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
    const status = searchParams.get("status");

    const range = parseReportDateRangeFromSearchParams(
      searchParams,
      defaultReportDateRange("year")
    );
    if ("error" in range) {
      return NextResponse.json({ error: range.error }, { status: 400 });
    }

    const where: { status?: string; createdAt?: { gte: Date; lte: Date } } = {
      createdAt: { gte: range.start, lte: range.end },
    };
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      where.status = status;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        bank: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totals = {
      pending: expenses.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0),
      approved: expenses.filter((e) => e.status === "approved").reduce((s, e) => s + e.amount, 0),
      rejected: expenses.filter((e) => e.status === "rejected").reduce((s, e) => s + e.amount, 0),
      total: expenses.reduce((s, e) => s + e.amount, 0),
    };

    return NextResponse.json({
      expenses,
      totals,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Expenses report error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
