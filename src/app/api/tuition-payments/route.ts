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
    const studentId = searchParams.get("studentId"); // studentId string e.g. STD-2026-0001
    const year = searchParams.get("year");
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const paginate = pageParam != null || pageSizeParam != null;
    const page = Math.max(1, Number(pageParam || 1));
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeParam || 10)));

    const where: { student?: { studentId?: string }; year?: number } = {};
    if (studentId) {
      where.student = { studentId: String(studentId) };
    }
    if (year) where.year = Number(year);

    const include = {
      student: {
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          department: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true, department: { select: { code: true } } } },
        },
      },
      bank: { select: { id: true, name: true, code: true } },
      recordedBy: { select: { id: true, name: true, email: true } },
    } as const;

    const orderBy = [{ paidAt: "desc" as const }];

    if (paginate) {
      const skip = (page - 1) * pageSize;
      const [items, total] = await Promise.all([
        prisma.tuitionPayment.findMany({
          where,
          skip,
          take: pageSize,
          include,
          orderBy,
        }),
        prisma.tuitionPayment.count({ where }),
      ]);
      return NextResponse.json({ items, total, page, pageSize });
    }

    const payments = await prisma.tuitionPayment.findMany({
      where,
      include,
      orderBy,
    });

    return NextResponse.json(payments);
  } catch (e) {
    console.error("Registration fee payments list error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      studentId: studentIdStr,
      amount,
      year,
      note,
      bankId,
      paymentMethod,
      receiptNumber,
      transactionId,
      paymentDate,
    } = body;

    if (!studentIdStr) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    if (!bankId) {
      return NextResponse.json(
        { error: "Bank is required for recording deposits" },
        { status: 400 }
      );
    }

    const bank = await prisma.bank.findUnique({
      where: { id: Number(bankId) },
    });
    if (!bank || !bank.isActive) {
      return NextResponse.json({ error: "Invalid or inactive bank" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { studentId: String(studentIdStr).trim() },
      include: { department: { select: { registrationFee: true } } },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const expectedFee = computeRegistrationFeeAmount(
      student.department.registrationFee,
      student.paymentStatus
    );
    const amt =
      amount != null
        ? Number(amount)
        : expectedFee > 0
          ? expectedFee
          : (student.department.registrationFee ?? 0);
    if (amt <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    const existing = await prisma.tuitionPayment.findUnique({
      where: { studentId: student.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Registration fee has already been collected for this student" },
        { status: 400 }
      );
    }

    const method = String(paymentMethod || "bank_receipt");
    if (method === "electronic" && !String(transactionId || "").trim()) {
      return NextResponse.json(
        { error: "Transaction ID is required for electronic payment" },
        { status: 400 }
      );
    }

    const paymentMethodVal =
      method === "electronic"
        ? "electronic"
        : method === "cash_on_hand"
          ? "cash_on_hand"
          : "bank_receipt";
    const paymentDateVal = paymentDate ? new Date(paymentDate) : new Date();
    const recordYear = year ? Number(year) : new Date().getFullYear();

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.tuitionPayment.create({
        data: {
          studentId: student.id,
          bankId: bank.id,
          amount: amt,
          year: recordYear,
          paymentMethod: paymentMethodVal,
          receiptNumber:
            paymentMethodVal === "bank_receipt" && receiptNumber
              ? String(receiptNumber).trim()
              : null,
          transactionId:
            paymentMethodVal === "electronic" && transactionId
              ? String(transactionId).trim()
              : null,
          paymentDate: paymentDateVal,
          recordedById: auth.userId,
          note: note || null,
        },
      });
      const newBalance = Math.max(0, (student.balance ?? 0) - amt);
      await tx.student.update({
        where: { id: student.id },
        data: { balance: newBalance },
      });
      await tx.bank.update({
        where: { id: bank.id },
        data: { balance: { increment: amt } },
      });
      await tx.transactionHistory.create({
        data: {
          type: "deposit",
          amount: amt,
          bankId: bank.id,
          description: `Registration: ${student.firstName} ${student.lastName} (${student.studentId})`,
          studentId: student.id,
          tuitionPaymentId: p.id,
          createdById: auth.userId,
        },
      });
      return tx.tuitionPayment.findUnique({
        where: { id: p.id },
        include: {
          student: {
            select: {
              studentId: true,
              firstName: true,
              lastName: true,
              department: { select: { name: true, code: true } },
            },
          },
        },
      });
    });

    return NextResponse.json(payment);
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Registration fee has already been collected for this student" },
        { status: 400 }
      );
    }
    console.error("Create registration fee payment error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
