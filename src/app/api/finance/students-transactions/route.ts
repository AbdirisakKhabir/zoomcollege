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
    const departmentId = searchParams.get("departmentId");
    const classId = searchParams.get("classId");
    const phone = searchParams.get("phone")?.trim();
    const search = searchParams.get("search")?.trim();
    const dateFrom = searchParams.get("dateFrom")?.trim();
    const dateTo = searchParams.get("dateTo")?.trim();

    const where: {
      status: string;
      departmentId?: number;
      classId?: number;
      phone?: { contains: string };
      OR?: { studentId?: { contains: string }; firstName?: { contains: string }; lastName?: { contains: string }; phone?: { contains: string } }[];
    } = { status: "Admitted" };
    if (departmentId) where.departmentId = Number(departmentId);
    if (classId) where.classId = Number(classId);
    if (search) {
      where.OR = [
        { studentId: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
      ];
    } else if (phone) {
      where.phone = { contains: phone };
    }

    const paymentWhere: { paidAt?: { gte?: Date; lte?: Date } } = {};
    if (dateFrom) paymentWhere.paidAt = { ...(paymentWhere.paidAt || {}), gte: new Date(dateFrom + "T00:00:00.000Z") };
    if (dateTo) paymentWhere.paidAt = { ...(paymentWhere.paidAt || {}), lte: new Date(dateTo + "T23:59:59.999Z") };

    const students = await prisma.student.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true, registrationFee: true } },
        class: { select: { id: true, name: true, department: { select: { code: true } } } },
        tuitionPayments: {
          where: Object.keys(paymentWhere).length > 0 ? paymentWhere : undefined,
          select: { id: true, year: true, amount: true, paidAt: true },
        },
      },
      orderBy: [{ studentId: "asc" }],
    });

    const result = students.map((s) => {
      const hasPaidRegistration = s.tuitionPayments.length > 0;
      const totalPaid = s.tuitionPayments.reduce((sum, p) => sum + p.amount, 0);

      return {
        id: s.id,
        studentId: s.studentId,
        firstName: s.firstName,
        lastName: s.lastName,
        department: s.department,
        class: s.class,
        registrationFee: s.department.registrationFee,
        payments: s.tuitionPayments,
        paidCount: s.tuitionPayments.length,
        unpaidCount: hasPaidRegistration ? 0 : 1,
        hasPaidRegistration,
        totalPaid,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Students transactions error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
