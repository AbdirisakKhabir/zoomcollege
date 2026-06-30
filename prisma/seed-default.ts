import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const DEFAULT_PERMISSIONS = [
  { name: "users.view", description: "View users", module: "users" },
  { name: "users.create", description: "Create users", module: "users" },
  { name: "users.edit", description: "Edit users", module: "users" },
  { name: "users.delete", description: "Delete users", module: "users" },
  { name: "roles.view", description: "View roles", module: "roles" },
  { name: "roles.create", description: "Create roles", module: "roles" },
  { name: "roles.edit", description: "Edit roles", module: "roles" },
  { name: "roles.delete", description: "Delete roles", module: "roles" },
  { name: "permissions.view", description: "View permissions", module: "permissions" },
  { name: "dashboard.view", description: "View dashboard", module: "dashboard" },
  { name: "departments.view", description: "View departments", module: "departments" },
  { name: "departments.create", description: "Create departments", module: "departments" },
  { name: "departments.edit", description: "Edit departments", module: "departments" },
  { name: "departments.delete", description: "Delete departments", module: "departments" },
  { name: "courses.view", description: "View courses", module: "courses" },
  { name: "courses.create", description: "Create courses", module: "courses" },
  { name: "courses.edit", description: "Edit courses", module: "courses" },
  { name: "courses.delete", description: "Delete courses", module: "courses" },
  { name: "classes.view", description: "View classes", module: "classes" },
  { name: "classes.create", description: "Create classes", module: "classes" },
  { name: "classes.edit", description: "Edit classes", module: "classes" },
  { name: "classes.delete", description: "Delete classes", module: "classes" },
  { name: "admission.view", description: "View student admissions", module: "admission" },
  { name: "admission.create", description: "Create student admissions", module: "admission" },
  { name: "admission.edit", description: "Edit student admissions", module: "admission" },
  { name: "admission.delete", description: "Delete student admissions", module: "admission" },
  { name: "attendance.view", description: "View attendance", module: "attendance" },
  { name: "attendance.create", description: "Take attendance", module: "attendance" },
  { name: "attendance.edit", description: "Edit attendance", module: "attendance" },
  { name: "attendance.delete", description: "Delete attendance sessions", module: "attendance" },
  { name: "examinations.view", description: "View examination records", module: "examinations" },
  { name: "examinations.create", description: "Create examination records", module: "examinations" },
  { name: "examinations.edit", description: "Edit examination records", module: "examinations" },
  { name: "examinations.delete", description: "Delete examination records", module: "examinations" },
  { name: "reports.view", description: "View reports", module: "reports" },
  { name: "finance.view", description: "View finance", module: "finance" },
  { name: "finance.create", description: "Record tuition payments", module: "finance" },
  { name: "lecturers.view", description: "View lecturers", module: "lecturers" },
  { name: "lecturers.create", description: "Create lecturers", module: "lecturers" },
  { name: "lecturers.edit", description: "Edit lecturers", module: "lecturers" },
  { name: "lecturers.delete", description: "Delete lecturers", module: "lecturers" },
  { name: "schedule.view", description: "View class schedule", module: "schedule" },
  { name: "schedule.create", description: "Create class schedule", module: "schedule" },
  { name: "schedule.edit", description: "Edit class schedule", module: "schedule" },
  { name: "schedule.delete", description: "Delete schedule slots", module: "schedule" },
  { name: "hr.view", description: "View HR (employees, positions)", module: "hr" },
  { name: "hr.create", description: "Create employees and positions", module: "hr" },
  { name: "hr.edit", description: "Edit employees and positions", module: "hr" },
  { name: "hr.delete", description: "Delete employees and positions", module: "hr" },
  { name: "banks.view", description: "View banks and balances", module: "finance" },
  { name: "banks.create", description: "Create banks", module: "finance" },
  { name: "banks.edit", description: "Edit banks", module: "finance" },
  { name: "banks.delete", description: "Delete banks", module: "finance" },
  { name: "banks.withdraw", description: "Withdraw from bank", module: "finance" },
  { name: "banks.transfer", description: "Transfer between banks", module: "finance" },
  { name: "expenses.view", description: "View expenses", module: "finance" },
  { name: "expenses.create", description: "Request expenses (Finance)", module: "finance" },
  { name: "expenses.approve", description: "Approve or reject expenses (President)", module: "finance" },
  { name: "payroll.view", description: "View payroll requests", module: "hr" },
  { name: "payroll.create", description: "Request payroll (HR)", module: "hr" },
  { name: "payroll.approve", description: "Approve or reject payroll (President)", module: "hr" },
];

async function assignRolePermissions(
  prisma: PrismaClient,
  roleId: number,
  permissionNames: string[],
  allPermissions: { id: number; name: string }[]
) {
  const perms = allPermissions.filter((p) => permissionNames.includes(p.name));
  for (const perm of perms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: perm.id } },
      create: { roleId, permissionId: perm.id },
      update: {},
    });
  }
}

export async function seedDefaultBootstrap(prisma: PrismaClient) {
  for (const p of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      create: p,
      update: {},
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    create: { name: "Admin", description: "Full system access" },
    update: {},
  });

  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
      },
      create: { roleId: adminRole.id, permissionId: perm.id },
      update: {},
    });
  }

  await prisma.bank.upsert({
    where: { code: "MAIN-001" },
    create: {
      name: "Main Bank Account",
      code: "MAIN-001",
      accountNumber: null,
      balance: 0,
    },
    update: {},
  });

  const currentYear = new Date().getFullYear();
  for (let startYear = 2015; startYear <= 2025; startYear++) {
    const endYear = startYear + 1;
    const name = `${startYear}-${endYear}`;
    await prisma.academicYear.upsert({
      where: { name },
      create: {
        startYear,
        endYear,
        name,
        isActive: startYear === currentYear - 1 || startYear === currentYear,
      },
      update: {},
    });
  }

  const hashed = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@zoomcollege.edu" },
    create: {
      email: "admin@zoomcollege.edu",
      password: hashed,
      name: "System Admin",
      roleId: adminRole.id,
      isSuperAdmin: true,
    },
    update: { isSuperAdmin: true },
  });

  const financeRole = await prisma.role.upsert({
    where: { name: "Finance" },
    create: { name: "Finance", description: "Finance staff - record payments, request expenses" },
    update: {},
  });
  await assignRolePermissions(prisma, financeRole.id, [
    "finance.view", "finance.create", "banks.view", "banks.withdraw", "banks.transfer",
    "expenses.view", "expenses.create", "reports.view", "dashboard.view",
  ], allPermissions);

  const presidentRole = await prisma.role.upsert({
    where: { name: "President" },
    create: { name: "President", description: "University President - approve expenses" },
    update: {},
  });
  await assignRolePermissions(prisma, presidentRole.id, [
    "finance.view", "banks.view", "expenses.view", "expenses.approve",
    "payroll.view", "payroll.approve", "reports.view", "dashboard.view",
  ], allPermissions);

  const deanRole = await prisma.role.upsert({
    where: { name: "Dean" },
    create: { name: "Dean", description: "Dean - academic oversight, manage departments and courses" },
    update: {},
  });
  await assignRolePermissions(prisma, deanRole.id, [
    "dashboard.view", "departments.view", "departments.edit",
    "courses.view", "courses.edit", "classes.view", "classes.edit",
    "lecturers.view", "lecturers.edit", "schedule.view", "schedule.edit",
    "admission.view", "attendance.view", "examinations.view", "reports.view",
  ], allPermissions);

  const lecturerRole = await prisma.role.upsert({
    where: { name: "Lecturer" },
    create: { name: "Lecturer", description: "Teaching staff - take attendance, record exams" },
    update: {},
  });
  await assignRolePermissions(prisma, lecturerRole.id, [
    "dashboard.view", "attendance.view", "attendance.create", "attendance.edit",
    "examinations.view", "examinations.create", "examinations.edit",
    "schedule.view", "classes.view", "lecturers.view",
  ], allPermissions);

  const hrRole = await prisma.role.upsert({
    where: { name: "HR" },
    create: { name: "HR", description: "Human Resources - manage employees and positions" },
    update: {},
  });
  await assignRolePermissions(prisma, hrRole.id, [
    "dashboard.view", "hr.view", "hr.create", "hr.edit", "hr.delete",
    "payroll.view", "payroll.create",
  ], allPermissions);

  const admissionRole = await prisma.role.upsert({
    where: { name: "Admission" },
    create: { name: "Admission", description: "Admission staff - manage student admissions, upgrades, transfers" },
    update: {},
  });
  await assignRolePermissions(prisma, admissionRole.id, [
    "dashboard.view", "admission.view", "admission.create", "admission.edit", "admission.delete",
    "departments.view", "classes.view",
  ], allPermissions);

  const defaultDepartments = [
    { code: "ACC", name: "Accounting" },
    { code: "ICT", name: "Information and Communication Technology" },
    { code: "HRM", name: "Human Resource Management" },
    { code: "LAB", name: "Laboratory Science" },
    { code: "SWE", name: "Software Engineering" },
  ];
  for (const d of defaultDepartments) {
    await prisma.department.upsert({
      where: { code: d.code },
      create: { ...d, registrationFee: 0 },
      update: { name: d.name },
    });
  }

  console.log("Default bootstrap seed completed. Admin: admin@zoomcollege.edu / admin123");
}
