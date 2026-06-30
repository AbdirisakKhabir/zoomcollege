import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  applyDepartmentIdScope,
  applyDepartmentScope,
  departmentScopeForbiddenResponse,
  getDepartmentScope,
  loadAuthContext,
  parseDepartmentIdParam,
  requireSuperAdmin,
} from "@/lib/department-access";
import { prisma } from "@/lib/prisma";
import { parsePaginationParams } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const { paginate, page, pageSize, skip } = parsePaginationParams(searchParams);
    const q = searchParams.get("q")?.trim();
    const where: Prisma.DepartmentWhereInput = {};
    const scope = getDepartmentScope(
      ctx,
      parseDepartmentIdParam(searchParams.get("departmentId"))
    );
    if (scope.kind === "none") return departmentScopeForbiddenResponse();
    applyDepartmentIdScope(where, scope);
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { code: { contains: q } },
        { description: { contains: q } },
      ];
    }

    if (paginate) {
      const [items, total] = await Promise.all([
        prisma.department.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { name: "asc" },
        }),
        prisma.department.count({ where }),
      ]);
      return NextResponse.json({ items, total, page, pageSize });
    }

    const departments = await prisma.department.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(departments);
  } catch (e) {
    console.error("Departments list error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const denied = requireSuperAdmin(ctx);
    if (denied) return denied;

    const body = await req.json();
    const { name, code, description, registrationFee } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    const department = await prisma.department.create({
      data: {
        name: String(name).trim(),
        code: String(code).trim().toUpperCase(),
        description: description || null,
        registrationFee: registrationFee != null ? Number(registrationFee) : null,
      },
    });

    return NextResponse.json(department);
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A department with this name or code already exists" },
        { status: 400 }
      );
    }
    console.error("Create department error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
