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
    const year = searchParams.get("year") || String(new Date().getFullYear());
    const departmentId = searchParams.get("departmentId");

    const where: { departmentId?: number } = {};
    if (departmentId) where.departmentId = Number(departmentId);

    const classes = await prisma.class.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        students: {
          include: {
            tuitionPayments: {
              where: { year: Number(year) },
              select: { year: true, amount: true },
            },
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    const result = classes.map((cls) => {
      const revenue = cls.students.reduce((sum, s) => {
        const paid = s.tuitionPayments.reduce((a, p) => a + p.amount, 0);
        return sum + paid;
      }, 0);
      const studentCount = cls.students.length;
      const paidCount = cls.students.filter((s) => s.tuitionPayments.length > 0).length;

      return {
        id: cls.id,
        name: cls.name,
        department: cls.department,
        studentCount,
        paidCount,
        unpaidCount: studentCount - paidCount,
        revenue,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Class revenue error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
