import type { PrismaClient } from "@prisma/client";

export type SeedDataSnapshot = {
  exportedAt: string;
  permissions: Record<string, unknown>[];
  roles: Record<string, unknown>[];
  rolePermissions: Record<string, unknown>[];
  academicYears: Record<string, unknown>[];
  departments: Record<string, unknown>[];
  banks: Record<string, unknown>[];
  positions: Record<string, unknown>[];
  lecturers: Record<string, unknown>[];
  users: Record<string, unknown>[];
  userDepartments: Record<string, unknown>[];
  lecturerDepartments: Record<string, unknown>[];
  courses: Record<string, unknown>[];
  classes: Record<string, unknown>[];
  lecturerCourses: Record<string, unknown>[];
  classSchedules: Record<string, unknown>[];
  courseAssessments: Record<string, unknown>[];
  students: Record<string, unknown>[];
  studentCases: Record<string, unknown>[];
  attendanceSessions: Record<string, unknown>[];
  attendanceRecords: Record<string, unknown>[];
  tuitionPayments: Record<string, unknown>[];
  studentMonthlyInvoices: Record<string, unknown>[];
  studentMonthlyPayments: Record<string, unknown>[];
  bankWithdrawals: Record<string, unknown>[];
  bankTransfers: Record<string, unknown>[];
  transactionHistory: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  employees: Record<string, unknown>[];
  payrolls: Record<string, unknown>[];
  examRecords: Record<string, unknown>[];
  conversations: Record<string, unknown>[];
  chatMessages: Record<string, unknown>[];
  conversationReads: Record<string, unknown>[];
};

function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (v instanceof Date ? v.toISOString() : v))
  ) as T;
}

export async function exportDatabaseSnapshot(prisma: PrismaClient): Promise<SeedDataSnapshot> {
  return {
    exportedAt: new Date().toISOString(),
    permissions: serialize(await prisma.permission.findMany({ orderBy: { id: "asc" } })),
    roles: serialize(await prisma.role.findMany({ orderBy: { id: "asc" } })),
    rolePermissions: serialize(await prisma.rolePermission.findMany()),
    academicYears: serialize(await prisma.academicYear.findMany({ orderBy: { id: "asc" } })),
    departments: serialize(await prisma.department.findMany({ orderBy: { id: "asc" } })),
    banks: serialize(await prisma.bank.findMany({ orderBy: { id: "asc" } })),
    positions: serialize(await prisma.position.findMany({ orderBy: { id: "asc" } })),
    lecturers: serialize(await prisma.lecturer.findMany({ orderBy: { id: "asc" } })),
    users: serialize(await prisma.user.findMany({ orderBy: { id: "asc" } })),
    userDepartments: serialize(await prisma.userDepartment.findMany()),
    lecturerDepartments: serialize(await prisma.lecturerDepartment.findMany()),
    courses: serialize(await prisma.course.findMany({ orderBy: { id: "asc" } })),
    classes: serialize(await prisma.class.findMany({ orderBy: { id: "asc" } })),
    lecturerCourses: serialize(await prisma.lecturerCourse.findMany()),
    classSchedules: serialize(await prisma.classSchedule.findMany({ orderBy: { id: "asc" } })),
    courseAssessments: serialize(
      await prisma.courseAssessment.findMany({ orderBy: { id: "asc" } })
    ),
    students: serialize(await prisma.student.findMany({ orderBy: { id: "asc" } })),
    studentCases: serialize(await prisma.studentCase.findMany({ orderBy: { id: "asc" } })),
    attendanceSessions: serialize(
      await prisma.attendanceSession.findMany({ orderBy: { id: "asc" } })
    ),
    attendanceRecords: serialize(
      await prisma.attendanceRecord.findMany({ orderBy: { id: "asc" } })
    ),
    tuitionPayments: serialize(await prisma.tuitionPayment.findMany({ orderBy: { id: "asc" } })),
    studentMonthlyInvoices: serialize(
      await prisma.studentMonthlyInvoice.findMany({ orderBy: { id: "asc" } })
    ),
    studentMonthlyPayments: serialize(
      await prisma.studentMonthlyPayment.findMany({ orderBy: { id: "asc" } })
    ),
    bankWithdrawals: serialize(await prisma.bankWithdrawal.findMany({ orderBy: { id: "asc" } })),
    bankTransfers: serialize(await prisma.bankTransfer.findMany({ orderBy: { id: "asc" } })),
    transactionHistory: serialize(
      await prisma.transactionHistory.findMany({ orderBy: { id: "asc" } })
    ),
    expenses: serialize(await prisma.expense.findMany({ orderBy: { id: "asc" } })),
    employees: serialize(await prisma.employee.findMany({ orderBy: { id: "asc" } })),
    payrolls: serialize(await prisma.payroll.findMany({ orderBy: { id: "asc" } })),
    examRecords: serialize(await prisma.examRecord.findMany({ orderBy: { id: "asc" } })),
    conversations: serialize(await prisma.conversation.findMany({ orderBy: { id: "asc" } })),
    chatMessages: serialize(await prisma.chatMessage.findMany({ orderBy: { id: "asc" } })),
    conversationReads: serialize(await prisma.conversationRead.findMany()),
  };
}

export function getSnapshotCounts(data: SeedDataSnapshot): Record<string, number> {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => key !== "exportedAt")
      .map(([key, rows]) => [key, Array.isArray(rows) ? rows.length : 0])
  );
}

export function getSnapshotRowCount(data: SeedDataSnapshot): number {
  return Object.values(getSnapshotCounts(data)).reduce((sum, count) => sum + count, 0);
}
