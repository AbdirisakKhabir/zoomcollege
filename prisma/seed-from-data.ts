import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
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

export const SEED_DATA_PATH = resolve(process.cwd(), "prisma/seed-data.json");

export function loadSeedDataSnapshot(): SeedDataSnapshot | null {
  if (!existsSync(SEED_DATA_PATH)) return null;
  const raw = readFileSync(SEED_DATA_PATH, "utf8");
  return JSON.parse(raw) as SeedDataSnapshot;
}

function asRows<T extends Record<string, unknown>>(rows: T[] | undefined): T[] {
  return Array.isArray(rows) ? rows : [];
}

async function resetAutoIncrement(
  prisma: PrismaClient,
  tableName: string,
  rows: { id?: number }[]
) {
  const maxId = rows.reduce((max, row) => Math.max(max, row.id ?? 0), 0);
  if (maxId > 0) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${tableName}\` AUTO_INCREMENT = ${maxId + 1}`);
  }
}

export async function seedFromDatabaseSnapshot(prisma: PrismaClient, data: SeedDataSnapshot) {
  console.log(`Restoring database snapshot exported at ${data.exportedAt}`);

  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");

  await prisma.conversationRead.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.studentCase.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.examRecord.deleteMany();
  await prisma.transactionHistory.deleteMany();
  await prisma.studentMonthlyPayment.deleteMany();
  await prisma.studentMonthlyInvoice.deleteMany();
  await prisma.tuitionPayment.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.bankTransfer.deleteMany();
  await prisma.bankWithdrawal.deleteMany();
  await prisma.classSchedule.deleteMany();
  await prisma.courseAssessment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.course.deleteMany();
  await prisma.lecturerCourse.deleteMany();
  await prisma.lecturerDepartment.deleteMany();
  await prisma.userDepartment.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.lecturer.deleteMany();
  await prisma.bank.deleteMany();
  await prisma.position.deleteMany();
  await prisma.department.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();

  const permissions = asRows(data.permissions);
  const roles = asRows(data.roles);
  const rolePermissions = asRows(data.rolePermissions);
  const academicYears = asRows(data.academicYears);
  const departments = asRows(data.departments);
  const banks = asRows(data.banks);
  const positions = asRows(data.positions);
  const lecturers = asRows(data.lecturers);
  const users = asRows(data.users);
  const userDepartments = asRows(data.userDepartments);
  const lecturerDepartments = asRows(data.lecturerDepartments);
  const courses = asRows(data.courses);
  const classes = asRows(data.classes);
  const lecturerCourses = asRows(data.lecturerCourses);
  const classSchedules = asRows(data.classSchedules);
  const courseAssessments = asRows(data.courseAssessments);
  const students = asRows(data.students);
  const studentCases = asRows(data.studentCases);
  const attendanceSessions = asRows(data.attendanceSessions);
  const attendanceRecords = asRows(data.attendanceRecords);
  const tuitionPayments = asRows(data.tuitionPayments);
  const studentMonthlyInvoices = asRows(data.studentMonthlyInvoices);
  const studentMonthlyPayments = asRows(data.studentMonthlyPayments);
  const bankWithdrawals = asRows(data.bankWithdrawals);
  const bankTransfers = asRows(data.bankTransfers);
  const transactionHistory = asRows(data.transactionHistory);
  const expenses = asRows(data.expenses);
  const employees = asRows(data.employees);
  const payrolls = asRows(data.payrolls);
  const examRecords = asRows(data.examRecords);
  const conversations = asRows(data.conversations);
  const chatMessages = asRows(data.chatMessages);
  const conversationReads = asRows(data.conversationReads);

  if (permissions.length) await prisma.permission.createMany({ data: permissions as never });
  if (roles.length) await prisma.role.createMany({ data: roles as never });
  if (rolePermissions.length) await prisma.rolePermission.createMany({ data: rolePermissions as never });
  if (academicYears.length) await prisma.academicYear.createMany({ data: academicYears as never });
  if (departments.length) await prisma.department.createMany({ data: departments as never });
  if (banks.length) await prisma.bank.createMany({ data: banks as never });
  if (positions.length) await prisma.position.createMany({ data: positions as never });
  if (lecturers.length) await prisma.lecturer.createMany({ data: lecturers as never });
  if (users.length) await prisma.user.createMany({ data: users as never });
  if (userDepartments.length) await prisma.userDepartment.createMany({ data: userDepartments as never });
  if (lecturerDepartments.length) {
    await prisma.lecturerDepartment.createMany({ data: lecturerDepartments as never });
  }
  if (courses.length) await prisma.course.createMany({ data: courses as never });
  if (classes.length) await prisma.class.createMany({ data: classes as never });
  if (lecturerCourses.length) await prisma.lecturerCourse.createMany({ data: lecturerCourses as never });
  if (classSchedules.length) await prisma.classSchedule.createMany({ data: classSchedules as never });
  if (courseAssessments.length) {
    await prisma.courseAssessment.createMany({ data: courseAssessments as never });
  }
  if (students.length) await prisma.student.createMany({ data: students as never });
  if (studentCases.length) await prisma.studentCase.createMany({ data: studentCases as never });
  if (attendanceSessions.length) {
    await prisma.attendanceSession.createMany({ data: attendanceSessions as never });
  }
  if (attendanceRecords.length) {
    await prisma.attendanceRecord.createMany({ data: attendanceRecords as never });
  }
  if (tuitionPayments.length) await prisma.tuitionPayment.createMany({ data: tuitionPayments as never });
  if (studentMonthlyInvoices.length) {
    await prisma.studentMonthlyInvoice.createMany({ data: studentMonthlyInvoices as never });
  }
  if (studentMonthlyPayments.length) {
    await prisma.studentMonthlyPayment.createMany({ data: studentMonthlyPayments as never });
  }
  if (bankWithdrawals.length) await prisma.bankWithdrawal.createMany({ data: bankWithdrawals as never });
  if (bankTransfers.length) await prisma.bankTransfer.createMany({ data: bankTransfers as never });
  if (transactionHistory.length) {
    await prisma.transactionHistory.createMany({ data: transactionHistory as never });
  }
  if (expenses.length) await prisma.expense.createMany({ data: expenses as never });
  if (employees.length) await prisma.employee.createMany({ data: employees as never });
  if (payrolls.length) await prisma.payroll.createMany({ data: payrolls as never });
  if (examRecords.length) await prisma.examRecord.createMany({ data: examRecords as never });
  if (conversations.length) await prisma.conversation.createMany({ data: conversations as never });
  if (chatMessages.length) await prisma.chatMessage.createMany({ data: chatMessages as never });
  if (conversationReads.length) {
    await prisma.conversationRead.createMany({ data: conversationReads as never });
  }

  await resetAutoIncrement(prisma, "permissions", permissions);
  await resetAutoIncrement(prisma, "roles", roles);
  await resetAutoIncrement(prisma, "academic_years", academicYears);
  await resetAutoIncrement(prisma, "departments", departments);
  await resetAutoIncrement(prisma, "banks", banks);
  await resetAutoIncrement(prisma, "positions", positions);
  await resetAutoIncrement(prisma, "lecturers", lecturers);
  await resetAutoIncrement(prisma, "users", users);
  await resetAutoIncrement(prisma, "courses", courses);
  await resetAutoIncrement(prisma, "classes", classes);
  await resetAutoIncrement(prisma, "class_schedules", classSchedules);
  await resetAutoIncrement(prisma, "course_assessments", courseAssessments);
  await resetAutoIncrement(prisma, "students", students);
  await resetAutoIncrement(prisma, "student_cases", studentCases);
  await resetAutoIncrement(prisma, "attendance_sessions", attendanceSessions);
  await resetAutoIncrement(prisma, "attendance_records", attendanceRecords);
  await resetAutoIncrement(prisma, "tuition_payments", tuitionPayments);
  await resetAutoIncrement(prisma, "student_monthly_invoices", studentMonthlyInvoices);
  await resetAutoIncrement(prisma, "student_monthly_payments", studentMonthlyPayments);
  await resetAutoIncrement(prisma, "bank_withdrawals", bankWithdrawals);
  await resetAutoIncrement(prisma, "bank_transfers", bankTransfers);
  await resetAutoIncrement(prisma, "transaction_history", transactionHistory);
  await resetAutoIncrement(prisma, "expenses", expenses);
  await resetAutoIncrement(prisma, "employees", employees);
  await resetAutoIncrement(prisma, "payrolls", payrolls);
  await resetAutoIncrement(prisma, "exam_records", examRecords);
  await resetAutoIncrement(prisma, "conversations", conversations);
  await resetAutoIncrement(prisma, "chat_messages", chatMessages);

  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");

  const counts = {
    permissions: permissions.length,
    roles: roles.length,
    users: users.length,
    departments: departments.length,
    students: students.length,
    courses: courses.length,
    classes: classes.length,
    banks: banks.length,
    tuitionPayments: tuitionPayments.length,
    studentMonthlyPayments: studentMonthlyPayments.length,
    examRecords: examRecords.length,
    attendanceSessions: attendanceSessions.length,
  };

  console.log("Database snapshot restored:", counts);
}
