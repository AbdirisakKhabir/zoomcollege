import { prisma } from "@/lib/prisma";

export type UserDepartmentInput = {
  departmentId: number;
  roleId: number;
};

export function normalizeDepartmentAssignments(
  raw: unknown
): UserDepartmentInput[] | null {
  if (!Array.isArray(raw)) return null;
  const out: UserDepartmentInput[] = [];
  const seen = new Set<number>();

  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const departmentId = Number((row as { departmentId?: unknown }).departmentId);
    const roleId = Number((row as { roleId?: unknown }).roleId);
    if (!Number.isInteger(departmentId) || departmentId <= 0) continue;
    if (!Number.isInteger(roleId) || roleId <= 0) continue;
    if (seen.has(departmentId)) continue;
    seen.add(departmentId);
    out.push({ departmentId, roleId });
  }

  return out;
}

export async function replaceUserDepartmentAssignments(
  userId: number,
  assignments: UserDepartmentInput[]
) {
  await prisma.$transaction([
    prisma.userDepartment.deleteMany({ where: { userId } }),
    ...(assignments.length > 0
      ? [
          prisma.userDepartment.createMany({
            data: assignments.map((a) => ({
              userId,
              departmentId: a.departmentId,
              roleId: a.roleId,
            })),
          }),
        ]
      : []),
  ]);
}

export async function validateDepartmentAssignments(
  assignments: UserDepartmentInput[]
): Promise<string | null> {
  if (assignments.length === 0) return null;

  const departmentIds = assignments.map((a) => a.departmentId);
  const roleIds = [...new Set(assignments.map((a) => a.roleId))];

  const [departments, roles] = await Promise.all([
    prisma.department.findMany({
      where: { id: { in: departmentIds }, isActive: true },
      select: { id: true },
    }),
    prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    }),
  ]);

  if (departments.length !== departmentIds.length) {
    return "One or more departments are invalid or inactive";
  }
  if (roles.length !== roleIds.length) {
    return "One or more roles are invalid";
  }
  return null;
}
