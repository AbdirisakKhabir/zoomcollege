import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRegistrationFeeAmount } from "@/lib/monthly-fee";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    const parsedClassId = Number(classId);
    if (!Number.isInteger(parsedClassId)) {
      return NextResponse.json({ error: "Invalid classId" }, { status: 400 });
    }

    const cls = await prisma.class.findUnique({
      where: { id: parsedClassId },
      include: {
        department: { select: { code: true, name: true, registrationFee: true } },
      },
    });

    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const studentsInClass = await prisma.student.findMany({
      where: { classId: parsedClassId, status: "Admitted" },
      include: {
        department: { select: { name: true, code: true, registrationFee: true } },
        tuitionPayments: {
          select: { id: true, amount: true },
        },
      },
      orderBy: [{ studentId: "asc" }],
    });

    const unpaidStudents = studentsInClass
      .filter((s) => {
        const paymentStatus = s.paymentStatus ?? "Fully Paid";
        if (paymentStatus === "Full Scholarship") return false;
        const expectedAmount = computeRegistrationFeeAmount(
          s.department.registrationFee,
          paymentStatus
        );
        const paidAmount = s.tuitionPayments.reduce((sum, p) => sum + p.amount, 0);
        return paidAmount < expectedAmount;
      })
      .map((s) => {
        const paymentStatus = s.paymentStatus ?? "Fully Paid";
        const expectedAmount = computeRegistrationFeeAmount(
          s.department.registrationFee,
          paymentStatus
        );
        const paidAmount = s.tuitionPayments.reduce((sum, p) => sum + p.amount, 0);
        const amountDue = expectedAmount - paidAmount;
        return {
          id: s.id,
          studentId: s.studentId,
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email,
          phone: s.phone,
          department: s.department,
          registrationFee: amountDue,
          paymentStatus,
          amountPaid: paidAmount,
          amountDue,
        };
      });

    return NextResponse.json({
      class: {
        id: cls.id,
        name: cls.name,
        department: cls.department,
      },
      unpaidStudents,
      totalUnpaid: unpaidStudents.length,
    });
  } catch (e) {
    console.error("Unpaid students error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
