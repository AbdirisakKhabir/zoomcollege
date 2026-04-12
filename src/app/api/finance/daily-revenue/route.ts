import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom") || new Date().toISOString().slice(0, 10);
    const dateTo = searchParams.get("dateTo") || new Date().toISOString().slice(0, 10);
    const bankId = searchParams.get("bankId");

    const dateFilter = {
      gte: new Date(dateFrom + "T00:00:00.000Z"),
      lte: new Date(dateTo + "T23:59:59.999Z"),
    };
    const bankFilter = bankId ? { bankId: Number(bankId) } : {};

    const [tuitionRows, monthlyRows] = await Promise.all([
      prisma.tuitionPayment.findMany({
        where: { paidAt: dateFilter, ...bankFilter },
        select: { amount: true, paidAt: true },
        orderBy: { paidAt: "desc" },
      }),
      prisma.studentMonthlyPayment.findMany({
        where: { paidAt: dateFilter, ...bankFilter },
        select: { amount: true, paidAt: true },
        orderBy: { paidAt: "desc" },
      }),
    ]);

    const payments = [...tuitionRows, ...monthlyRows].sort(
      (a, b) => b.paidAt.getTime() - a.paidAt.getTime()
    );

    const byDate: Record<string, { total: number; count: number }> = {};
    for (const p of payments) {
      const d = p.paidAt.toISOString().slice(0, 10);
      if (!byDate[d]) byDate[d] = { total: 0, count: 0 };
      byDate[d].total += p.amount;
      byDate[d].count += 1;
    }

    const dailySummary = Object.entries(byDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const totalRevenue = tuitionRows.reduce((sum, p) => sum + p.amount, 0)
      + monthlyRows.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      dateFrom,
      dateTo,
      totalRevenue,
      totalCount: payments.length,
      dailySummary,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Daily revenue report error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
