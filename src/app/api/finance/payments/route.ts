import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { parseReportDateParam } from "@/lib/report-date-range";
import { prisma } from "@/lib/prisma";

const studentInclude = {
  select: {
    studentId: true,
    firstName: true,
    lastName: true,
    department: { select: { name: true, code: true } },
  },
} as const;

const bankSelect = { select: { id: true, name: true, code: true } } as const;
const recordedBySelect = { select: { id: true, name: true, email: true } } as const;

export type FinanceUnifiedPaymentItem =
  | {
      kind: "tuition";
      id: number;
      amount: number;
      year: number;
      paymentMethod: string;
      receiptNumber: string | null;
      transactionId: string | null;
      paymentDate: string;
      paidAt: string;
      note: string | null;
      bank: { id: number; name: string; code: string } | null;
      student: {
        studentId: string;
        firstName: string;
        lastName: string;
        department: { name: string; code: string };
      };
      recordedBy: { id: number; name: string | null; email: string } | null;
    }
  | {
      kind: "monthly";
      id: number;
      batchId: string;
      calendarYear: number;
      month: number;
      amount: number;
      paymentMethod: string;
      receiptNumber: string | null;
      transactionId: string | null;
      paymentDate: string;
      paidAt: string;
      note: string | null;
      bank: { id: number; name: string; code: string } | null;
      student: {
        studentId: string;
        firstName: string;
        lastName: string;
        department: { name: string; code: string };
      };
      recordedBy: { id: number; name: string | null; email: string } | null;
    };

function buildStudentWhere(
  studentId: string | null,
  departmentId: string | null,
  q: string | null
): Prisma.StudentWhereInput | undefined {
  const where: Prisma.StudentWhereInput = {};
  if (studentId) {
    where.studentId = studentId;
  }
  if (departmentId && departmentId !== "all") {
    const id = Number(departmentId);
    if (Number.isInteger(id) && id > 0) {
      where.departmentId = id;
    }
  }
  const search = q?.trim();
  if (search) {
    where.OR = [
      { studentId: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
    ];
  }
  return Object.keys(where).length > 0 ? where : undefined;
}

function buildPaymentWhere(
  studentWhere: Prisma.StudentWhereInput | undefined,
  dateFrom: string | null,
  dateTo: string | null,
  bankId: string | null
) {
  const where: Prisma.TuitionPaymentWhereInput & Prisma.StudentMonthlyPaymentWhereInput = {};

  if (studentWhere) {
    where.student = studentWhere;
  }

  const start = dateFrom ? parseReportDateParam(dateFrom) : null;
  const end = dateTo ? parseReportDateParam(dateTo, true) : null;
  if (start || end) {
    where.paymentDate = {};
    if (start) where.paymentDate.gte = start;
    if (end) where.paymentDate.lte = end;
  }

  if (bankId && bankId !== "all") {
    const id = Number(bankId);
    if (Number.isInteger(id) && id > 0) {
      where.bankId = id;
    }
  }

  return where;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const studentId = searchParams.get("studentId");
    const departmentId = searchParams.get("departmentId");
    const q = searchParams.get("q");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const bankId = searchParams.get("bankId");
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const page = Math.max(1, Number(pageParam || 1));
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeParam || 10)));

    const studentWhere = buildStudentWhere(studentId, departmentId, q);
    const paymentWhere = buildPaymentWhere(studentWhere, dateFrom, dateTo, bankId);

    const includeRegistration = type === "all" || type === "registration" || type === "tuition";
    const includeMonthly = type === "all" || type === "monthly";

    const [tuitions, monthlies] = await Promise.all([
      includeRegistration
        ? prisma.tuitionPayment.findMany({
            where: paymentWhere,
            include: {
              student: studentInclude,
              bank: bankSelect,
              recordedBy: recordedBySelect,
            },
            orderBy: [{ paymentDate: "desc" }, { paidAt: "desc" }],
          })
        : Promise.resolve([]),
      includeMonthly
        ? prisma.studentMonthlyPayment.findMany({
            where: paymentWhere,
            include: {
              student: studentInclude,
              bank: bankSelect,
              recordedBy: recordedBySelect,
            },
            orderBy: [{ paymentDate: "desc" }, { year: "desc" }, { month: "desc" }],
          })
        : Promise.resolve([]),
    ]);

    const tuitionItems: FinanceUnifiedPaymentItem[] = tuitions.map((t) => ({
      kind: "tuition",
      id: t.id,
      amount: t.amount,
      year: t.year,
      paymentMethod: t.paymentMethod,
      receiptNumber: t.receiptNumber,
      transactionId: t.transactionId,
      paymentDate: t.paymentDate.toISOString(),
      paidAt: t.paidAt.toISOString(),
      note: t.note,
      bank: t.bank
        ? { id: t.bank.id, name: t.bank.name, code: t.bank.code }
        : null,
      student: {
        studentId: t.student.studentId,
        firstName: t.student.firstName,
        lastName: t.student.lastName,
        department: {
          name: t.student.department.name,
          code: t.student.department.code,
        },
      },
      recordedBy: t.recordedBy
        ? {
            id: t.recordedBy.id,
            name: t.recordedBy.name,
            email: t.recordedBy.email,
          }
        : null,
    }));

    const monthlyItems: FinanceUnifiedPaymentItem[] = monthlies.map((m) => ({
      kind: "monthly",
      id: m.id,
      batchId: m.batchId,
      calendarYear: m.year,
      month: m.month,
      amount: m.amount,
      paymentMethod: m.paymentMethod,
      receiptNumber: m.receiptNumber,
      transactionId: m.transactionId,
      paymentDate: m.paymentDate.toISOString(),
      paidAt: m.paidAt.toISOString(),
      note: m.note,
      bank: m.bank
        ? { id: m.bank.id, name: m.bank.name, code: m.bank.code }
        : null,
      student: {
        studentId: m.student.studentId,
        firstName: m.student.firstName,
        lastName: m.student.lastName,
        department: {
          name: m.student.department.name,
          code: m.student.department.code,
        },
      },
      recordedBy: m.recordedBy
        ? {
            id: m.recordedBy.id,
            name: m.recordedBy.name,
            email: m.recordedBy.email,
          }
        : null,
    }));

    const combined = [...tuitionItems, ...monthlyItems].sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );

    const total = combined.length;
    const totalAmount = combined.reduce((sum, p) => sum + p.amount, 0);
    const skip = (page - 1) * pageSize;
    const items = combined.slice(skip, skip + pageSize);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      summary: {
        totalAmount,
        registrationCount: tuitionItems.length,
        monthlyCount: monthlyItems.length,
      },
    });
  } catch (e) {
    console.error("Finance payments list error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
