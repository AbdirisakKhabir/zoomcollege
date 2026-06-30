import { NextRequest, NextResponse } from "next/server";
import {
  assertDepartmentAccess,
  loadAuthContext,
} from "@/lib/department-access";
import { computeMonthlyInvoiceAmount } from "@/lib/monthly-fee";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentIdStr = searchParams.get("studentId")?.trim();
    const idRaw = searchParams.get("id");

    if (!studentIdStr && !idRaw) {
      return NextResponse.json({ error: "studentId or id is required" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: studentIdStr
        ? { studentId: studentIdStr }
        : { id: Number(idRaw) },
      include: {
        department: { select: { id: true, name: true, code: true, registrationFee: true } },
        class: {
          select: {
            id: true,
            name: true,
            department: { select: { code: true, name: true } },
          },
        },
        admissionAcademicYear: { select: { name: true } },
        tuitionPayments: {
          orderBy: [{ year: "desc" }],
          include: { bank: { select: { code: true, name: true } } },
        },
        monthlyFeePayments: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          include: { bank: { select: { code: true, name: true } } },
        },
        monthlyInvoices: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const denied = assertDepartmentAccess(ctx, student.departmentId);
    if (denied) return denied;

    const monthlyFee = computeMonthlyInvoiceAmount(student.fee, student.paymentStatus);

    const totalRegistrationPaid = student.tuitionPayments.reduce((s, p) => s + p.amount, 0);
    const totalMonthlyPaid = student.monthlyFeePayments.reduce((s, p) => s + p.amount, 0);

    return NextResponse.json({
      student: {
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        gender: student.gender,
        status: student.status,
        paymentStatus: student.paymentStatus,
        balance: student.balance ?? 0,
        fee: student.fee,
        monthlyFee,
        admissionDate: student.admissionDate,
        department: student.department,
        class: student.class,
        admissionAcademicYear: student.admissionAcademicYear,
      },
      registrationPayments: student.tuitionPayments,
      monthlyFeePayments: student.monthlyFeePayments,
      monthlyInvoices: student.monthlyInvoices,
      summary: {
        totalRegistrationPaid: Math.round(totalRegistrationPaid * 100) / 100,
        totalMonthlyPaid: Math.round(totalMonthlyPaid * 100) / 100,
        totalPaid: Math.round((totalRegistrationPaid + totalMonthlyPaid) * 100) / 100,
        registrationPaymentCount: student.tuitionPayments.length,
        monthlyPaymentCount: student.monthlyFeePayments.length,
        invoiceCount: student.monthlyInvoices.length,
      },
    });
  } catch (e) {
    console.error("Individual student report error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
