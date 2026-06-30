import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isValidAssessmentKey,
  validateWeightsSum,
} from "@/lib/course-assessments";
import {
  listClassesForCourse,
  loadAssessmentsForClassCourse,
  validateClassCourseAssignment,
} from "@/lib/course-assessment-scope";

type RouteContext = { params: Promise<{ id: string }> };

function parseClassId(searchParams: URLSearchParams, body?: unknown): number | null {
  const fromQuery = searchParams.get("classId");
  const raw =
    fromQuery ??
    (body && typeof body === "object" && "classId" in body
      ? String((body as { classId: unknown }).classId ?? "")
      : "");
  if (!raw) return null;
  const classId = Number(raw);
  return Number.isInteger(classId) && classId > 0 ? classId : null;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await ctx.params;
    const courseId = Number(rawId);
    if (!Number.isInteger(courseId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const classId = parseClassId(searchParams);
    const classes = await listClassesForCourse(courseId);

    if (!classId) {
      return NextResponse.json({
        courseId,
        classes,
        assessments: [],
        message:
          classes.length === 0
            ? "No active classes in this department yet."
            : "Select a class to view or edit assessments.",
      });
    }

    const valid = await validateClassCourseAssignment(courseId, classId);
    if (!valid.ok) {
      return NextResponse.json({ error: valid.error }, { status: 400 });
    }

    const assessments = await loadAssessmentsForClassCourse(courseId, classId, {
      seedIfEmpty: true,
    });

    return NextResponse.json({ courseId, classId, classes, assessments });
  } catch (e) {
    console.error("Get course assessments error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await ctx.params;
    const courseId = Number(rawId);
    if (!Number.isInteger(courseId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const body = await req.json();
    const classId = parseClassId(new URL(req.url).searchParams, body);
    if (!classId) {
      return NextResponse.json(
        { error: "classId is required — select the class this assessment setup applies to" },
        { status: 400 }
      );
    }

    const valid = await validateClassCourseAssignment(courseId, classId);
    if (!valid.ok) {
      return NextResponse.json({ error: valid.error }, { status: 400 });
    }

    const items = body?.items as
      | { name: string; key: string; weightPercent: number }[]
      | undefined;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items must be a non-empty array of { name, key, weightPercent }" },
        { status: 400 }
      );
    }

    const seen = new Set<string>();
    const normalized: { name: string; key: string; weightPercent: number; sortOrder: number }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const name = String(it?.name ?? "").trim();
      const key = String(it?.key ?? "").trim();
      const weightPercent = Number(it?.weightPercent);
      if (!name) {
        return NextResponse.json({ error: `Row ${i + 1}: name is required` }, { status: 400 });
      }
      if (!isValidAssessmentKey(key)) {
        return NextResponse.json(
          {
            error: `Row ${i + 1}: key must start with a letter and contain only letters, numbers, underscores`,
          },
          { status: 400 }
        );
      }
      if (seen.has(key)) {
        return NextResponse.json({ error: `Duplicate key: ${key}` }, { status: 400 });
      }
      seen.add(key);
      if (!Number.isFinite(weightPercent) || weightPercent <= 0) {
        return NextResponse.json(
          { error: `Row ${i + 1}: weightPercent must be a positive number` },
          { status: 400 }
        );
      }
      normalized.push({ name, key, weightPercent, sortOrder: i });
    }

    const wErr = validateWeightsSum(normalized);
    if (wErr) {
      return NextResponse.json({ error: wErr }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.courseAssessment.deleteMany({ where: { courseId, classId } }),
      prisma.courseAssessment.createMany({
        data: normalized.map((n) => ({
          courseId,
          classId,
          name: n.name,
          key: n.key,
          weightPercent: n.weightPercent,
          sortOrder: n.sortOrder,
        })),
      }),
    ]);

    const assessments = await prisma.courseAssessment.findMany({
      where: { courseId, classId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    const classes = await listClassesForCourse(courseId);

    return NextResponse.json({ courseId, classId, classes, assessments });
  } catch (e) {
    console.error("Put course assessments error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
