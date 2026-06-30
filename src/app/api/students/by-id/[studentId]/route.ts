import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ studentId: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentId } = await ctx.params;
    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { studentId: decodeURIComponent(studentId) },
      include: {
        department: { select: { id: true, name: true, code: true, registrationFee: true } },
        class: {
          select: {
            id: true,
            name: true,
            department: { select: { code: true, name: true } },
          },
        },
        tuitionPayments: {
          orderBy: [{ year: "desc" }, { paidAt: "desc" }],
          select: {
            id: true,
            year: true,
            amount: true,
            paidAt: true,
            paymentDate: true,
            paymentMethod: true,
            bank: { select: { code: true, name: true } },
          },
        },
        monthlyFeePayments: {
          orderBy: [{ year: "desc" }, { month: "desc" }, { paidAt: "desc" }],
          select: {
            id: true,
            year: true,
            month: true,
            amount: true,
            paidAt: true,
            paymentDate: true,
            paymentMethod: true,
            bank: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (e) {
    console.error("Get student by ID error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
