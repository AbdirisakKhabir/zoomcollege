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

    const paymentSelect = {
      amount: true,
      paidAt: true,
      student: {
        select: {
          class: {
            select: {
              id: true,
              name: true,
              department: { select: { id: true, name: true, code: true } },
            },
          },
        },
      },
    } as const;

    const [tuitionRows, monthlyRows] = await Promise.all([
      prisma.tuitionPayment.findMany({
        where: { paidAt: dateFilter, ...bankFilter },
        select: paymentSelect,
        orderBy: { paidAt: "desc" },
      }),
      prisma.studentMonthlyPayment.findMany({
        where: { paidAt: dateFilter, ...bankFilter },
        select: paymentSelect,
        orderBy: { paidAt: "desc" },
      }),
    ]);

    const payments = [...tuitionRows, ...monthlyRows].sort(
      (a, b) => b.paidAt.getTime() - a.paidAt.getTime()
    );

    const byDate: Record<string, { total: number; count: number }> = {};
    const byClass = new Map<
      number,
      {
        classId: number;
        name: string;
        department: { id: number; name: string; code: string };
        total: number;
        count: number;
      }
    >();
    const unassigned = { total: 0, count: 0 };

    for (const p of payments) {
      const d = p.paidAt.toISOString().slice(0, 10);
      if (!byDate[d]) byDate[d] = { total: 0, count: 0 };
      byDate[d].total += p.amount;
      byDate[d].count += 1;

      const cls = p.student.class;
      if (!cls) {
        unassigned.total += p.amount;
        unassigned.count += 1;
        continue;
      }

      const existing = byClass.get(cls.id);
      if (existing) {
        existing.total += p.amount;
        existing.count += 1;
      } else {
        byClass.set(cls.id, {
          classId: cls.id,
          name: cls.name,
          department: cls.department,
          total: p.amount,
          count: 1,
        });
      }
    }

    const dailySummary = Object.entries(byDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const classSummary = [...byClass.values()].sort((a, b) => b.total - a.total);
    if (unassigned.count > 0) {
      classSummary.push({
        classId: 0,
        name: "Unassigned",
        department: { id: 0, name: "—", code: "—" },
        total: unassigned.total,
        count: unassigned.count,
      });
    }

    const totalRevenue = tuitionRows.reduce((sum, p) => sum + p.amount, 0)
      + monthlyRows.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      dateFrom,
      dateTo,
      totalRevenue,
      totalCount: payments.length,
      dailySummary,
      classSummary,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Daily revenue report error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
