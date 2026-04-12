import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateTotalFromScoreMap, getGradeInfo } from "@/lib/grades";
import { mergeScores, parseScoresJson } from "@/lib/course-assessments";
import { seedDefaultAssessmentsIfEmpty } from "@/lib/seed-course-assessments";

const courseInclude = {
  select: {
    id: true,
    name: true,
    code: true,
    creditHours: true,
    department: { select: { id: true, name: true, code: true } },
    assessments: {
      orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
      select: {
        id: true,
        name: true,
        key: true,
        weightPercent: true,
        sortOrder: true,
      },
    },
  },
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const record = await prisma.examRecord.findUnique({
      where: { id: Number(id) },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
        course: courseInclude,
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Exam record not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (e) {
    console.error("Get exam record error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    if (body?.scores === undefined || body.scores === null || typeof body.scores !== "object") {
      return NextResponse.json({ error: "scores object is required" }, { status: 400 });
    }
    const scoresPatch = body.scores as Record<string, number | undefined>;

    const existing = await prisma.examRecord.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return NextResponse.json({ error: "Exam record not found" }, { status: 404 });
    }

    await seedDefaultAssessmentsIfEmpty(existing.courseId);

    const assessments = await prisma.courseAssessment.findMany({
      where: { courseId: existing.courseId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    const prev = parseScoresJson(existing.scores);
    const patch = scoresPatch;

    const { scores, error } = mergeScores(prev, patch, assessments);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const totalMarks = calculateTotalFromScoreMap(scores);
    const { grade, gradePoints } = getGradeInfo(totalMarks);

    const updated = await prisma.examRecord.update({
      where: { id: Number(id) },
      data: { scores, totalMarks, grade, gradePoints },
      include: {
        student: {
          select: { id: true, studentId: true, firstName: true, lastName: true, imageUrl: true },
        },
        course: courseInclude,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Update exam record error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.examRecord.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return NextResponse.json({ error: "Exam record not found" }, { status: 404 });
    }

    await prisma.examRecord.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Exam record deleted" });
  } catch (e) {
    console.error("Delete exam record error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
