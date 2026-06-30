import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  applyDepartmentScope,
  assertDepartmentAccess,
  departmentScopeForbiddenResponse,
  getDepartmentScope,
  loadAuthContext,
  parseDepartmentIdParam,
} from "@/lib/department-access";
import { prisma } from "@/lib/prisma";
import { computeMonthlyInvoiceAmount } from "@/lib/monthly-fee";
import type { Prisma } from "@prisma/client";

function monthName(m: number): string {
  return new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" });
}

function parseYearMonth(
  searchParams: URLSearchParams
): { year: number; month: number } | null {
  const dateStr = searchParams.get("date")?.trim();
  if (dateStr) {
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    }
  }
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= 2100 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  ) {
    return { year, month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** GET — students with outstanding balance (optional class + billing month filters). */
export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ym = parseYearMonth(searchParams);
    if (!ym) {
      return NextResponse.json({ error: "Invalid date or year/month" }, { status: 400 });
    }
    const { year, month } = ym;

    const classIdRaw = searchParams.get("classId");
    const where: Prisma.StudentWhereInput = {
      status: "Admitted",
      balance: { gt: 0 },
    };
    const scope = getDepartmentScope(
      ctx,
      parseDepartmentIdParam(searchParams.get("departmentId"))
    );
    if (scope.kind === "none") return departmentScopeForbiddenResponse();
    applyDepartmentScope(where, scope);
    if (classIdRaw && classIdRaw !== "all") {
      const classId = Number(classIdRaw);
      if (!Number.isInteger(classId) || classId <= 0) {
        return NextResponse.json({ error: "Invalid classId" }, { status: 400 });
      }
      where.classId = classId;
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        department: { select: { name: true, code: true, registrationFee: true } },
        class: {
          select: { id: true, name: true },
        },
        monthlyFeePayments: {
          where: { year, month },
          select: { id: true, amount: true, paymentDate: true },
        },
        monthlyInvoices: {
          where: { year, month },
          select: { id: true, amount: true },
        },
      },
      orderBy: [{ balance: "desc" }, { studentId: "asc" }],
    });

    const rows = students.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      firstName: s.firstName,
      lastName: s.lastName,
      phone: s.phone,
      gender: s.gender,
      email: s.email,
      status: s.status,
      balance: s.balance ?? 0,
      paymentStatus: s.paymentStatus,
      fee: s.fee,
      department: s.department,
      class: s.class,
      monthlyFee: computeMonthlyInvoiceAmount(s.fee, s.paymentStatus),
      paidForMonth: s.monthlyFeePayments.length > 0,
      monthPaymentAmount: s.monthlyFeePayments.reduce((sum, p) => sum + p.amount, 0),
      invoicedForMonth: s.monthlyInvoices.length > 0,
      monthInvoiceAmount: s.monthlyInvoices.reduce((sum, i) => sum + i.amount, 0),
    }));

    return NextResponse.json({
      year,
      month,
      monthLabel: monthName(month),
      students: rows,
      summary: {
        count: rows.length,
        totalBalance: Math.round(rows.reduce((sum, r) => sum + r.balance, 0) * 100) / 100,
        unpaidForMonth: rows.filter((r) => !r.paidForMonth).length,
      },
    });
  } catch (e) {
    console.error("Monthly balance list error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

function amountsForMonths(amountPerMonth: number, monthCount: number): number[] {
  const unitCents = Math.round(amountPerMonth * 100);
  if (unitCents <= 0 || monthCount <= 0) return [];
  return Array.from({ length: monthCount }, () => unitCents / 100);
}

function paymentMethodLabel(method: string): string {
  switch (method) {
    case "electronic":
      return "Electronic";
    case "cash_on_hand":
      return "Cash on Hand";
    default:
      return "Bank Receipt";
  }
}

function buildPaymentNote(
  description: string,
  discountAmount: number
): string | null {
  const parts: string[] = [];
  if (description) parts.push(description);
  if (discountAmount > 0) {
    parts.push(`Discount: $${discountAmount.toFixed(2)}`);
  }
  const combined = parts.join(" | ").trim();
  return combined ? combined.slice(0, 500) : null;
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const studentIdStr = String(body.studentId ?? "").trim();
    const year = Number(body.year);
    const monthsRaw = body.months;
    const depositAmountRaw =
      body.depositAmount != null ? Number(body.depositAmount) : Number(body.amountPerMonth);
    const discountAmount = body.discountAmount != null ? Number(body.discountAmount) : 0;
    const bankIdRaw = body.bankId != null ? Number(body.bankId) : NaN;
    const paymentMethod = String(body.paymentMethod || "cash_on_hand");
    const receiptNumber = body.receiptNumber != null ? String(body.receiptNumber).trim() : "";
    const transactionId = body.transactionId != null ? String(body.transactionId).trim() : "";
    const paymentDateStr = body.paymentDate != null ? String(body.paymentDate) : "";
    const description =
      body.description != null
        ? String(body.description).trim().slice(0, 500)
        : body.note != null
          ? String(body.note).trim().slice(0, 500)
          : "";

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

    if (!Number.isFinite(depositAmountRaw) || depositAmountRaw < 0) {
      return NextResponse.json(
        { error: "Amount paid must be zero or greater" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      return NextResponse.json({ error: "Invalid discount amount" }, { status: 400 });
    }

    if (depositAmountRaw + discountAmount <= 0) {
      return NextResponse.json(
        { error: "Amount paid and/or discount is required" },
        { status: 400 }
      );
    }

    const method =
      paymentMethod === "electronic"
        ? "electronic"
        : paymentMethod === "bank_receipt"
          ? "bank_receipt"
          : "cash_on_hand";

    if (method === "bank_receipt" && !receiptNumber) {
      return NextResponse.json(
        { error: "Receipt number is required for bank receipt payments" },
        { status: 400 }
      );
    }

    if (method === "electronic" && !transactionId) {
      return NextResponse.json(
        { error: "Transaction ID is required for electronic payments" },
        { status: 400 }
      );
    }

    let bank =
      Number.isInteger(bankIdRaw) && bankIdRaw > 0
        ? await prisma.bank.findUnique({ where: { id: bankIdRaw } })
        : null;

    if (!bank) {
      bank = await prisma.bank.findFirst({
        where: { isActive: true },
        orderBy: { id: "asc" },
      });
    }

    if (!bank || !bank.isActive) {
      return NextResponse.json(
        { error: "No active bank account is configured for deposits" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { studentId: studentIdStr },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const deptDenied = assertDepartmentAccess(ctx, student.departmentId);
    if (deptDenied) return deptDenied;

    if (student.status !== "Admitted") {
      return NextResponse.json(
        { error: "Only admitted students can record monthly fee payments" },
        { status: 400 }
      );
    }

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

    const totalAmount = Math.round(depositAmountRaw * 100) / 100;
    const balanceCredit =
      Math.round((totalAmount + discountAmount) * 100) / 100;
    if (balanceCredit > (student.balance ?? 0) + 0.001) {
      return NextResponse.json(
        { error: "Amount paid and discount together exceed the student's balance" },
        { status: 400 }
      );
    }

    const lineAmounts =
      months.length === 1
        ? [totalAmount]
        : amountsForMonths(totalAmount / months.length, months.length);
    const noteText = buildPaymentNote(description, discountAmount);
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
            receiptNumber: method === "bank_receipt" ? receiptNumber : null,
            transactionId: method === "electronic" ? transactionId : null,
            paymentDate: paymentDateVal,
            recordedById: ctx.userId,
            note: noteText,
          },
        });
        created.push({ id: row.id, month, amount: amt });
      }

      const firstId = created[0]?.id;
      if (!firstId) {
        throw new Error("No payment rows created");
      }

      const newBalance = Math.max(0, (student.balance ?? 0) - balanceCredit);
      await tx.student.update({
        where: { id: student.id },
        data: { balance: newBalance },
      });

      if (totalAmount > 0) {
        await tx.bank.update({
          where: { id: bank.id },
          data: { balance: { increment: totalAmount } },
        });
      }

      const monthLabel = months.map((m) => monthName(m)).join(", ");
      const historyParts = [
        `Monthly fee: ${student.firstName} ${student.lastName} (${student.studentId}) — ${monthLabel} ${year}`,
        `${paymentMethodLabel(method)}`,
      ];
      if (discountAmount > 0) {
        historyParts.push(`Discount $${discountAmount.toFixed(2)}`);
      }
      if (description) {
        historyParts.push(description);
      }

      await tx.transactionHistory.create({
        data: {
          type: "deposit",
          amount: totalAmount,
          bankId: bank.id,
          description: historyParts.join(" · ").slice(0, 500),
          studentId: student.id,
          studentMonthlyPaymentId: firstId,
          createdById: ctx.userId,
        },
      });

      return { created, firstId };
    });

    return NextResponse.json({
      batchId,
      paymentDate: paymentDateVal.toISOString(),
      year,
      months,
      depositAmount: totalAmount,
      discountAmount,
      paymentMethod: method,
      description: description || null,
      amountPerMonth: lineAmounts[0] ?? totalAmount,
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
      newBalance: Math.max(0, (student.balance ?? 0) - balanceCredit),
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
