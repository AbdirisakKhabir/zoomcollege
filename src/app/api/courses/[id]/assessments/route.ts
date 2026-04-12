import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isValidAssessmentKey,
  validateWeightsSum,
} from "@/lib/course-assessments";
import { seedDefaultAssessmentsIfEmpty } from "@/lib/seed-course-assessments";

type RouteContext = { params: Promise<{ id: string }> };

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

    await seedDefaultAssessmentsIfEmpty(courseId);

    const assessments = await prisma.courseAssessment.findMany({
      where: { courseId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({ courseId, assessments });
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
      prisma.courseAssessment.deleteMany({ where: { courseId } }),
      prisma.courseAssessment.createMany({
        data: normalized.map((n) => ({
          courseId,
          name: n.name,
          key: n.key,
          weightPercent: n.weightPercent,
          sortOrder: n.sortOrder,
        })),
      }),
    ]);

    const assessments = await prisma.courseAssessment.findMany({
      where: { courseId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({ courseId, assessments });
  } catch (e) {
    console.error("Put course assessments error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
