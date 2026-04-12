import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
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
      semester: string;
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

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const page = Math.max(1, Number(pageParam || 1));
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeParam || 10)));

    const tuitionWhere: {
      student?: { studentId: string };
    } = {};
    const monthlyWhere: {
      student?: { studentId: string };
    } = {};
    if (studentId) {
      tuitionWhere.student = { studentId: String(studentId) };
      monthlyWhere.student = { studentId: String(studentId) };
    }

    const [tuitions, monthlies] = await Promise.all([
      prisma.tuitionPayment.findMany({
        where: tuitionWhere,
        include: {
          student: studentInclude,
          bank: bankSelect,
          recordedBy: recordedBySelect,
        },
        orderBy: [{ year: "desc" }, { semester: "asc" }, { paidAt: "desc" }],
      }),
      prisma.studentMonthlyPayment.findMany({
        where: monthlyWhere,
        include: {
          student: studentInclude,
          bank: bankSelect,
          recordedBy: recordedBySelect,
        },
        orderBy: [{ year: "desc" }, { month: "desc" }, { paidAt: "desc" }],
      }),
    ]);

    const tuitionItems: FinanceUnifiedPaymentItem[] = tuitions.map((t) => ({
      kind: "tuition",
      id: t.id,
      amount: t.amount,
      semester: t.semester,
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
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
    );

    const total = combined.length;
    const skip = (page - 1) * pageSize;
    const items = combined.slice(skip, skip + pageSize);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (e) {
    console.error("Finance payments list error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
