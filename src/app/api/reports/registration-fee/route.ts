import { NextRequest, NextResponse } from "next/server";
import {
  applyDepartmentScope,
  departmentScopeForbiddenResponse,
  getDepartmentScope,
  loadAuthContext,
  parseDepartmentIdParam,
} from "@/lib/department-access";
import { computeRegistrationFeeAmount } from "@/lib/monthly-fee";
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
    const status = searchParams.get("status")?.trim() || "all";
    const dateFrom = searchParams.get("dateFrom")?.trim();
    const dateTo = searchParams.get("dateTo")?.trim();

    if (!["all", "paid", "unpaid"].includes(status)) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }

    const where: Prisma.StudentWhereInput = { status: "Admitted" };

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

    const paymentDateFilter: Prisma.DateTimeFilter | undefined =
      dateFrom || dateTo
        ? {
            ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
            ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
          }
        : undefined;

    if (status === "paid") {
      where.tuitionPayments = paymentDateFilter
        ? { some: { paymentDate: paymentDateFilter } }
        : { some: {} };
    } else if (status === "unpaid") {
      where.tuitionPayments = { none: {} };
    } else if (paymentDateFilter) {
      where.tuitionPayments = { some: { paymentDate: paymentDateFilter } };
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true, registrationFee: true } },
        class: {
          select: {
            id: true,
            name: true,
            department: { select: { code: true } },
          },
        },
        tuitionPayments: {
          include: { bank: { select: { id: true, code: true, name: true } } },
          orderBy: { paidAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ departmentId: "asc" }, { studentId: "asc" }],
    });

    const rows = students
      .map((s) => {
        const payment = s.tuitionPayments[0] ?? null;
        const expectedFee = computeRegistrationFeeAmount(
          s.department.registrationFee,
          s.paymentStatus
        );
        const amountPaid = payment?.amount ?? 0;
        const isPaid = Boolean(payment);

        if (status === "all" && paymentDateFilter && !isPaid) {
          return null;
        }

        return {
          id: s.id,
          studentId: s.studentId,
          firstName: s.firstName,
          lastName: s.lastName,
          phone: s.phone,
          paymentStatus: s.paymentStatus,
          balance: s.balance ?? 0,
          department: s.department,
          class: s.class,
          expectedFee,
          amountPaid,
          amountDue: Math.max(0, expectedFee - amountPaid),
          isPaid,
          paidAt: payment?.paidAt ?? null,
          paymentDate: payment?.paymentDate ?? null,
          bank: payment?.bank ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const paidRows = rows.filter((r) => r.isPaid);
    const unpaidRows = rows.filter((r) => !r.isPaid && r.expectedFee > 0);

    return NextResponse.json({
      students: rows,
      summary: {
        count: rows.length,
        paidCount: paidRows.length,
        unpaidCount: unpaidRows.length,
        totalCollected: Math.round(paidRows.reduce((s, r) => s + r.amountPaid, 0) * 100) / 100,
        totalExpected: Math.round(rows.reduce((s, r) => s + r.expectedFee, 0) * 100) / 100,
        totalOutstanding: Math.round(unpaidRows.reduce((s, r) => s + r.amountDue, 0) * 100) / 100,
      },
    });
  } catch (e) {
    console.error("Registration fee report error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
