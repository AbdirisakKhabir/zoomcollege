/**
 * Export the current database into prisma/seed-data.json for use by `npx prisma seed`.
 *
 * Usage: npm run db:export-seed
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";

function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (v instanceof Date ? v.toISOString() : v))
  ) as T;
}

async function main() {
  const data = {
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

  const outPath = resolve(process.cwd(), "prisma/seed-data.json");
  writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");

  const counts = Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => key !== "exportedAt")
      .map(([key, rows]) => [key, Array.isArray(rows) ? rows.length : 0])
  );

  console.log("Exported database snapshot to prisma/seed-data.json");
  console.log(counts);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
