import type { Prisma } from "@prisma/client";
import type { AuthContext } from "@/lib/department-access";
import { parseReportDateParam } from "@/lib/report-date-range";
import { prisma } from "@/lib/prisma";

export type AiAnalysisTopic = "overview" | "finance" | "admission" | "attendance" | "examinations";

export type AnalyticsSnapshot = {
  generatedAt: string;
  topic: AiAnalysisTopic;
  dateRange: { from: string; to: string };
  scope: { isSuperAdmin: boolean; departmentIds: number[] | "all" };
  summary: Record<string, unknown>;
};

function studentDepartmentFilter(ctx: AuthContext): Prisma.StudentWhereInput {
  if (ctx.isSuperAdmin) return {};
  if (ctx.allowedDepartmentIds.length === 0) {
    return { departmentId: -1 };
  }
  return { departmentId: { in: ctx.allowedDepartmentIds } };
}

function departmentFilter(ctx: AuthContext): Prisma.DepartmentWhereInput {
  if (ctx.isSuperAdmin) return { isActive: true };
  if (ctx.allowedDepartmentIds.length === 0) {
    return { id: -1 };
  }
  return { id: { in: ctx.allowedDepartmentIds }, isActive: true };
}

export async function buildAnalyticsSnapshot(
  ctx: AuthContext,
  topic: AiAnalysisTopic,
  dateFrom: string,
  dateTo: string
): Promise<AnalyticsSnapshot> {
  const start = parseReportDateParam(dateFrom);
  const end = parseReportDateParam(dateTo, true);
  const studentWhere = studentDepartmentFilter(ctx);
  const deptWhere = departmentFilter(ctx);

  const [
    departments,
    studentsByStatus,
    studentsByDepartment,
    totalStudents,
    admittedStudents,
    studentsWithBalance,
    totalOutstandingBalance,
    tuitionInRange,
    monthlyPaymentsInRange,
    banks,
    attendanceSessionsInRange,
    attendanceRecordsInRange,
    examRecordsInRange,
    recentCases,
    usersActive,
  ] = await Promise.all([
    prisma.department.findMany({
      where: deptWhere,
      select: { id: true, code: true, name: true, registrationFee: true },
      orderBy: { code: "asc" },
    }),
    prisma.student.groupBy({
      by: ["status"],
      where: studentWhere,
      _count: { id: true },
    }),
    prisma.student.groupBy({
      by: ["departmentId"],
      where: { ...studentWhere, status: "Admitted" },
      _count: { id: true },
    }),
    prisma.student.count({ where: studentWhere }),
    prisma.student.count({ where: { ...studentWhere, status: "Admitted" } }),
    prisma.student.count({ where: { ...studentWhere, balance: { gt: 0 } } }),
    prisma.student.aggregate({
      where: { ...studentWhere, balance: { gt: 0 } },
      _sum: { balance: true },
    }),
    prisma.tuitionPayment.findMany({
      where: {
        paymentDate: { gte: start, lte: end },
        student: studentWhere,
      },
      select: { amount: true, paymentDate: true },
    }),
    prisma.studentMonthlyPayment.findMany({
      where: {
        paymentDate: { gte: start, lte: end },
        student: studentWhere,
      },
      select: { amount: true, paymentDate: true, year: true, month: true },
    }),
    prisma.bank.findMany({
      where: { isActive: true },
      select: { code: true, name: true, balance: true },
      orderBy: { code: "asc" },
    }),
    prisma.attendanceSession.count({
      where: {
        date: { gte: start, lte: end },
        class:
          ctx.isSuperAdmin || ctx.allowedDepartmentIds.length === 0
            ? undefined
            : { departmentId: { in: ctx.allowedDepartmentIds } },
      },
    }),
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: {
        session: {
          date: { gte: start, lte: end },
          class:
            ctx.isSuperAdmin || ctx.allowedDepartmentIds.length === 0
              ? undefined
              : { departmentId: { in: ctx.allowedDepartmentIds } },
        },
        student: studentWhere,
      },
      _count: { id: true },
    }),
    prisma.examRecord.aggregate({
      where: {
        student: studentWhere,
        createdAt: { gte: start, lte: end },
      },
      _avg: { totalMarks: true, gradePoints: true },
      _count: { id: true },
    }),
    prisma.studentCase.count({
      where: {
        caseDate: { gte: start, lte: end },
        student: studentWhere,
      },
    }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
  const registrationTotal = tuitionInRange.reduce((s, p) => s + p.amount, 0);
  const monthlyTotal = monthlyPaymentsInRange.reduce((s, p) => s + p.amount, 0);
  const bankBalanceTotal = banks.reduce((s, b) => s + b.balance, 0);

  const attendanceTotals = Object.fromEntries(
    attendanceRecordsInRange.map((r) => [r.status, r._count.id])
  );
  const present = (attendanceTotals.Present ?? 0) + (attendanceTotals.Excused ?? 0);
  const attendanceDenom = attendanceRecordsInRange.reduce((s, r) => s + r._count.id, 0);

  const summary: Record<string, unknown> = {
    organization: {
      activeDepartments: departments.length,
      activeUsers: usersActive,
      departments: departments.map((d) => ({
        code: d.code,
        name: d.name,
        registrationFee: d.registrationFee,
        admittedStudents:
          studentsByDepartment.find((s) => s.departmentId === d.id)?._count.id ?? 0,
      })),
    },
    students: {
      total: totalStudents,
      admitted: admittedStudents,
      byStatus: studentsByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      withOutstandingBalance: studentsWithBalance,
      totalOutstandingBalance: totalOutstandingBalance._sum.balance ?? 0,
      openCasesInPeriod: recentCases,
    },
    finance: {
      registrationPaymentsInPeriod: {
        count: tuitionInRange.length,
        total: registrationTotal,
      },
      monthlyFeePaymentsInPeriod: {
        count: monthlyPaymentsInRange.length,
        total: monthlyTotal,
      },
      totalRevenueInPeriod: registrationTotal + monthlyTotal,
      bankAccounts: banks,
      totalBankBalance: bankBalanceTotal,
    },
    attendance: {
      sessionsInPeriod: attendanceSessionsInRange,
      recordsInPeriod: attendanceDenom,
      presentOrExcused: present,
      absent: attendanceTotals.Absent ?? 0,
      late: attendanceTotals.Late ?? 0,
      attendanceRatePercent:
        attendanceDenom > 0 ? Math.round((present / attendanceDenom) * 1000) / 10 : null,
    },
    examinations: {
      recordsInPeriod: examRecordsInRange._count.id,
      averageTotalMarks: examRecordsInRange._avg.totalMarks,
      averageGpa: examRecordsInRange._avg.gradePoints,
    },
  };

  if (topic === "finance") {
    return buildSnapshot(ctx, topic, dateFrom, dateTo, {
      finance: summary.finance,
      students: {
        withOutstandingBalance: (summary.students as { withOutstandingBalance: number })
          .withOutstandingBalance,
        totalOutstandingBalance: (summary.students as { totalOutstandingBalance: number })
          .totalOutstandingBalance,
      },
    });
  }
  if (topic === "admission") {
    return buildSnapshot(ctx, topic, dateFrom, dateTo, {
      students: summary.students,
      organization: summary.organization,
    });
  }
  if (topic === "attendance") {
    return buildSnapshot(ctx, topic, dateFrom, dateTo, {
      attendance: summary.attendance,
      organization: { departments: summary.organization },
    });
  }
  if (topic === "examinations") {
    return buildSnapshot(ctx, topic, dateFrom, dateTo, {
      examinations: summary.examinations,
      organization: { departments: summary.organization },
    });
  }

  return buildSnapshot(ctx, topic, dateFrom, dateTo, summary);
}

function buildSnapshot(
  ctx: AuthContext,
  topic: AiAnalysisTopic,
  dateFrom: string,
  dateTo: string,
  summary: Record<string, unknown>
): AnalyticsSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    topic,
    dateRange: { from: dateFrom, to: dateTo },
    scope: {
      isSuperAdmin: ctx.isSuperAdmin,
      departmentIds: ctx.isSuperAdmin ? "all" : ctx.allowedDepartmentIds,
    },
    summary,
  };
}
