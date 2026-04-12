import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function monthName(m: number): string {
  return new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" });
}

function amountsForMonths(amountPerMonth: number, monthCount: number): number[] {
  const unitCents = Math.round(amountPerMonth * 100);
  if (unitCents <= 0 || monthCount <= 0) return [];
  return Array.from({ length: monthCount }, () => unitCents / 100);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const studentIdStr = String(body.studentId ?? "").trim();
    const year = Number(body.year);
    const monthsRaw = body.months;
    const amountPerMonth = Number(body.amountPerMonth);
    const bankId = Number(body.bankId);
    const paymentMethod = String(body.paymentMethod || "cash_on_hand");
    const paymentDateStr = body.paymentDate != null ? String(body.paymentDate) : "";
    const note = body.note != null ? String(body.note).trim().slice(0, 500) : "";

    if (!studentIdStr) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    if (!Array.isArray(monthsRaw) || monthsRaw.length === 0) {
      return NextResponse.json({ error: "Select at least one month" }, { status: 400 });
    }

    const months = [...new Set(monthsRaw.map((m: unknown) => Number(m)))]
      .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12)
      .sort((a, b) => a - b);

    if (months.length === 0) {
      return NextResponse.json({ error: "Invalid months (use 1–12)" }, { status: 400 });
    }

    if (!Number.isFinite(amountPerMonth) || amountPerMonth <= 0) {
      return NextResponse.json({ error: "Amount per month must be greater than 0" }, { status: 400 });
    }

    if (!Number.isInteger(bankId) || bankId <= 0) {
      return NextResponse.json({ error: "Bank is required" }, { status: 400 });
    }

    const bank = await prisma.bank.findUnique({ where: { id: bankId } });
    if (!bank || !bank.isActive) {
      return NextResponse.json({ error: "Invalid or inactive bank" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { studentId: studentIdStr },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.status !== "Admitted") {
      return NextResponse.json(
        { error: "Only admitted students can record monthly fee payments" },
        { status: 400 }
      );
    }

    const method =
      paymentMethod === "electronic"
        ? "electronic"
        : paymentMethod === "bank_receipt"
          ? "bank_receipt"
          : "cash_on_hand";

    const paymentDateVal = paymentDateStr ? new Date(paymentDateStr) : new Date();
    if (Number.isNaN(paymentDateVal.getTime())) {
      return NextResponse.json({ error: "Invalid payment date" }, { status: 400 });
    }

    const existing = await prisma.studentMonthlyPayment.findMany({
      where: {
        studentId: student.id,
        year,
        month: { in: months },
      },
      select: { month: true },
    });

    if (existing.length > 0) {
      const taken = existing.map((e) => monthName(e.month)).join(", ");
      return NextResponse.json(
        {
          error: `Payment already recorded for: ${taken} ${year}. Remove those months or pick different months.`,
          conflictingMonths: existing.map((e) => e.month),
        },
        { status: 400 }
      );
    }

    const lineAmounts = amountsForMonths(amountPerMonth, months.length);
    const totalAmount = lineAmounts.reduce((s, a) => s + a, 0);
    const batchId = randomUUID();

    const result = await prisma.$transaction(async (tx) => {
      const created: { id: number; month: number; amount: number }[] = [];

      for (let i = 0; i < months.length; i++) {
        const month = months[i];
        const amt = lineAmounts[i] ?? lineAmounts[0];
        const row = await tx.studentMonthlyPayment.create({
          data: {
            batchId,
            studentId: student.id,
            bankId: bank.id,
            year,
            month,
            amount: amt,
            paymentMethod: method,
            receiptNumber: null,
            transactionId: null,
            paymentDate: paymentDateVal,
            recordedById: auth.userId,
            note: note || null,
          },
        });
        created.push({ id: row.id, month, amount: amt });
      }

      const firstId = created[0]?.id;
      if (!firstId) {
        throw new Error("No payment rows created");
      }

      const newBalance = Math.max(0, (student.balance ?? 0) - totalAmount);
      await tx.student.update({
        where: { id: student.id },
        data: { balance: newBalance },
      });

      await tx.bank.update({
        where: { id: bank.id },
        data: { balance: { increment: totalAmount } },
      });

      const monthLabel = months.map((m) => monthName(m)).join(", ");
      await tx.transactionHistory.create({
        data: {
          type: "deposit",
          amount: totalAmount,
          bankId: bank.id,
          description: `Monthly fee: ${student.firstName} ${student.lastName} (${student.studentId}) — ${monthLabel} ${year}`,
          studentId: student.id,
          studentMonthlyPaymentId: firstId,
          createdById: auth.userId,
        },
      });

      return { created, firstId };
    });

    return NextResponse.json({
      batchId,
      paymentDate: paymentDateVal.toISOString(),
      year,
      months,
      amountPerMonth: lineAmounts[0] ?? amountPerMonth,
      totalAmount,
      student: {
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
      },
      bank: {
        code: bank.code,
        name: bank.name,
      },
      newBalance: Math.max(0, (student.balance ?? 0) - totalAmount),
    });
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A payment already exists for one of these months" },
        { status: 400 }
      );
    }
    console.error("Monthly fee payment error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
