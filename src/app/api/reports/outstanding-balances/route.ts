import { NextRequest, NextResponse } from "next/server";
import {
  applyDepartmentScope,
  departmentScopeForbiddenResponse,
  getDepartmentScope,
  loadAuthContext,
  parseDepartmentIdParam,
} from "@/lib/department-access";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classIdRaw = searchParams.get("classId");
    const dateFrom = searchParams.get("dateFrom")?.trim();
    const dateTo = searchParams.get("dateTo")?.trim();

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

    if (classIdRaw) {
      const classId = Number(classIdRaw);
      if (Number.isInteger(classId) && classId > 0) where.classId = classId;
    }

    if (dateFrom || dateTo) {
      const invoiceWhere: Prisma.StudentMonthlyInvoiceWhereInput = {};
      if (dateFrom || dateTo) {
        invoiceWhere.createdAt = {};
        if (dateFrom) {
          invoiceWhere.createdAt.gte = new Date(`${dateFrom}T00:00:00.000Z`);
        }
        if (dateTo) {
          invoiceWhere.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
        }
      }
      where.monthlyInvoices = { some: invoiceWhere };
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        monthlyInvoices: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 1,
          select: { year: true, month: true, amount: true, createdAt: true },
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
      paymentStatus: s.paymentStatus,
      balance: s.balance ?? 0,
      department: s.department,
      class: s.class,
      lastInvoice: s.monthlyInvoices[0] ?? null,
    }));

    const totalBalance = rows.reduce((sum, r) => sum + r.balance, 0);

    return NextResponse.json({
      students: rows,
      summary: {
        count: rows.length,
        totalBalance: Math.round(totalBalance * 100) / 100,
      },
      filters: {
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      },
    });
  } catch (e) {
    console.error("Outstanding balances report error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
