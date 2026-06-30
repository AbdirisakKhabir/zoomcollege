import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  applyDepartmentScope,
  assertDepartmentAccess,
  departmentScopeForbiddenResponse,
  getDepartmentScope,
  loadAuthContext,
  parseDepartmentIdParam,
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
    const where: Prisma.ClassWhereInput = {};
    const scope = getDepartmentScope(
      ctx,
      parseDepartmentIdParam(searchParams.get("departmentId"))
    );
    if (scope.kind === "none") return departmentScopeForbiddenResponse();
    applyDepartmentScope(where, scope);
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { room: { contains: q } },
        { department: { name: { contains: q } } },
      ];
    }

    const include = {
      department: { select: { id: true, name: true, code: true } },
    } as const;

    const orderBy = [{ name: "asc" as const }];

    if (paginate) {
      const [items, total] = await Promise.all([
        prisma.class.findMany({
          where,
          skip,
          take: pageSize,
          include,
          orderBy,
        }),
        prisma.class.count({ where }),
      ]);
      return NextResponse.json({ items, total, page, pageSize });
    }

    const classes = await prisma.class.findMany({
      where,
      include,
      orderBy,
    });

    return NextResponse.json(classes);
  } catch (e) {
    console.error("Classes list error:", e);
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

    const body = await req.json();
    const { name, departmentId, room, schedule, capacity } = body;
    const parsedDepartmentId = Number(departmentId);

    if (!name || !Number.isInteger(parsedDepartmentId)) {
      return NextResponse.json(
        { error: "Name and departmentId are required" },
        { status: 400 }
      );
    }

    const deptDenied = assertDepartmentAccess(ctx, parsedDepartmentId);
    if (deptDenied) return deptDenied;

    const cls = await prisma.class.create({
      data: {
        name: String(name).trim(),
        departmentId: parsedDepartmentId,
        room: room || null,
        schedule: schedule || null,
        capacity: Number(capacity) > 0 ? Number(capacity) : 40,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(cls);
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A class with this name already exists in this department" },
        { status: 400 }
      );
    }
    console.error("Create class error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
