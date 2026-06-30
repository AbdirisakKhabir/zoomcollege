import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type DepartmentAssignment = {
  departmentId: number;
  departmentName: string;
  departmentCode: string;
  roleId: number;
  roleName: string;
  permissions: string[];
};

export type AuthContext = {
  userId: number;
  email: string;
  isSuperAdmin: boolean;
  roleId: number;
  roleName: string;
  permissions: string[];
  departmentAssignments: DepartmentAssignment[];
  allowedDepartmentIds: number[];
  activeDepartmentId: number | null;
};

export type DepartmentScope =
  | { kind: "all" }
  | { kind: "one"; departmentId: number }
  | { kind: "many"; departmentIds: number[] }
  | { kind: "none" };

const userWithDepartmentsInclude = {
  role: {
    include: {
      permissions: { include: { permission: true } },
    },
  },
  departmentAssignments: {
    include: {
      department: { select: { id: true, name: true, code: true, isActive: true } },
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  },
} as const;

function permissionNames(
  rows: { permission: { name: string } }[]
): string[] {
  return rows.map((rp) => rp.permission.name);
}

function mapAssignments(
  rows: {
    departmentId: number;
    roleId: number;
    department: { id: number; name: string; code: string; isActive: boolean };
    role: {
      id: number;
      name: string;
      permissions: { permission: { name: string } }[];
    };
  }[]
): DepartmentAssignment[] {
  return rows
    .filter((a) => a.department.isActive)
    .map((a) => ({
      departmentId: a.departmentId,
      departmentName: a.department.name,
      departmentCode: a.department.code,
      roleId: a.roleId,
      roleName: a.role.name,
      permissions: permissionNames(a.role.permissions),
    }));
}

export function getRequestedDepartmentId(req: NextRequest): number | null {
  const header = req.headers.get("x-department-id");
  if (header) {
    const id = Number(header);
    if (Number.isInteger(id) && id > 0) return id;
  }
  const q = new URL(req.url).searchParams.get("departmentId");
  if (q && q !== "all") {
    const id = Number(q);
    if (Number.isInteger(id) && id > 0) return id;
  }
  return null;
}

export function parseDepartmentIdParam(value: string | null): number | null {
  if (!value || value === "all") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function loadAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const jwt = await getAuthUser(req);
  if (!jwt) return null;

  const user = await prisma.user.findUnique({
    where: { id: jwt.userId, isActive: true },
    include: userWithDepartmentsInclude,
  });
  if (!user) return null;

  return buildAuthContextFromUser(user, getRequestedDepartmentId(req));
}

export async function loadAuthContextByUserId(
  userId: number,
  activeDepartmentId?: number | null
): Promise<AuthContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    include: userWithDepartmentsInclude,
  });
  if (!user) return null;
  return buildAuthContextFromUser(user, activeDepartmentId ?? null);
}

function buildAuthContextFromUser(
  user: {
    id: number;
    email: string;
    roleId: number;
    isSuperAdmin: boolean;
    role: {
      name: string;
      permissions: { permission: { name: string } }[];
    };
    departmentAssignments: {
      departmentId: number;
      roleId: number;
      department: { id: number; name: string; code: string; isActive: boolean };
      role: {
        id: number;
        name: string;
        permissions: { permission: { name: string } }[];
      };
    }[];
  },
  requestedDepartmentId: number | null
): AuthContext {
  const assignments = mapAssignments(user.departmentAssignments);
  const basePermissions = permissionNames(user.role.permissions);

  if (user.isSuperAdmin) {
    return {
      userId: user.id,
      email: user.email,
      isSuperAdmin: true,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: basePermissions,
      departmentAssignments: assignments,
      allowedDepartmentIds: [],
      activeDepartmentId: requestedDepartmentId,
    };
  }

  const allowedDepartmentIds = assignments.map((a) => a.departmentId);

  if (allowedDepartmentIds.length === 0) {
    return {
      userId: user.id,
      email: user.email,
      isSuperAdmin: false,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: basePermissions,
      departmentAssignments: assignments,
      allowedDepartmentIds: [],
      activeDepartmentId: null,
    };
  }

  let activeDepartmentId = requestedDepartmentId ?? allowedDepartmentIds[0] ?? null;
  if (activeDepartmentId && !allowedDepartmentIds.includes(activeDepartmentId)) {
    activeDepartmentId = allowedDepartmentIds[0] ?? null;
  }

  const activeAssignment = assignments.find((a) => a.departmentId === activeDepartmentId);

  return {
    userId: user.id,
    email: user.email,
    isSuperAdmin: false,
    roleId: activeAssignment?.roleId ?? user.roleId,
    roleName: activeAssignment?.roleName ?? user.role.name,
    permissions: activeAssignment?.permissions ?? basePermissions,
    departmentAssignments: assignments,
    allowedDepartmentIds,
    activeDepartmentId,
  };
}

export function authUserPayload(ctx: AuthContext) {
  return {
    id: ctx.userId,
    email: ctx.email,
    roleId: ctx.roleId,
    roleName: ctx.roleName,
    permissions: ctx.permissions,
    isSuperAdmin: ctx.isSuperAdmin,
    activeDepartmentId: ctx.activeDepartmentId,
    departmentAssignments: ctx.departmentAssignments,
  };
}

export function hasPermission(ctx: AuthContext, permission: string): boolean {
  if (
    ctx.isSuperAdmin ||
    ctx.permissions.includes("admin") ||
    ctx.permissions.includes("*")
  ) {
    return true;
  }
  return ctx.permissions.includes(permission);
}

export function getDepartmentScope(
  ctx: AuthContext,
  requestedDepartmentId?: number | null
): DepartmentScope {
  if (ctx.isSuperAdmin) {
    if (requestedDepartmentId && requestedDepartmentId > 0) {
      return { kind: "one", departmentId: requestedDepartmentId };
    }
    return { kind: "all" };
  }

  if (ctx.allowedDepartmentIds.length === 0) {
    return { kind: "none" };
  }

  if (requestedDepartmentId && requestedDepartmentId > 0) {
    if (!ctx.allowedDepartmentIds.includes(requestedDepartmentId)) {
      return { kind: "none" };
    }
    return { kind: "one", departmentId: requestedDepartmentId };
  }

  if (ctx.activeDepartmentId) {
    return { kind: "one", departmentId: ctx.activeDepartmentId };
  }

  return { kind: "many", departmentIds: ctx.allowedDepartmentIds };
}

export function applyDepartmentScope(
  where: Record<string, unknown>,
  scope: DepartmentScope
): void {
  switch (scope.kind) {
    case "all":
      return;
    case "one":
      where.departmentId = scope.departmentId;
      return;
    case "many":
      where.departmentId = { in: scope.departmentIds };
      return;
    case "none":
      where.departmentId = -1;
      return;
  }
}

export function applyDepartmentIdScope(
  where: Record<string, unknown>,
  scope: DepartmentScope
): void {
  switch (scope.kind) {
    case "all":
      return;
    case "one":
      where.id = scope.departmentId;
      return;
    case "many":
      where.id = { in: scope.departmentIds };
      return;
    case "none":
      where.id = -1;
      return;
  }
}

export function departmentScopeForbiddenResponse(): NextResponse {
  return NextResponse.json(
    { error: "Forbidden: you do not have access to this department" },
    { status: 403 }
  );
}

export function superAdminRequiredResponse(): NextResponse {
  return NextResponse.json(
    { error: "Super Admin access required" },
    { status: 403 }
  );
}

export function assertDepartmentAccess(
  ctx: AuthContext,
  departmentId: number
): NextResponse | null {
  if (ctx.isSuperAdmin) return null;
  if (!ctx.allowedDepartmentIds.includes(departmentId)) {
    return departmentScopeForbiddenResponse();
  }
  return null;
}

export function requireSuperAdmin(ctx: AuthContext): NextResponse | null {
  if (!ctx.isSuperAdmin) return superAdminRequiredResponse();
  return null;
}

export async function resolveResourceDepartmentId(
  resource: "student" | "course" | "class",
  id: number
): Promise<number | null> {
  if (resource === "student") {
    const row = await prisma.student.findUnique({
      where: { id },
      select: { departmentId: true },
    });
    return row?.departmentId ?? null;
  }
  if (resource === "course") {
    const row = await prisma.course.findUnique({
      where: { id },
      select: { departmentId: true },
    });
    return row?.departmentId ?? null;
  }
  const row = await prisma.class.findUnique({
    where: { id },
    select: { departmentId: true },
  });
  return row?.departmentId ?? null;
}
