import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateTotalFromScoreMap, getGradeInfo } from "@/lib/grades";
import { normalizeScoresForCourse } from "@/lib/course-assessments";
import {
  loadAssessmentsForClassCourse,
  seedDefaultAssessmentsIfEmpty,
} from "@/lib/course-assessment-scope";

const courseInclude = {
  select: {
    id: true,
    name: true,
    code: true,
    creditHours: true,
    department: { select: { id: true, name: true, code: true } },
  },
};

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const courseId = searchParams.get("courseId");
    const year = searchParams.get("year");

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = Number(studentId);
    if (courseId) where.courseId = Number(courseId);
    if (year) where.year = Number(year);

    const records = await prisma.examRecord.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
            departmentId: true,
          },
        },
        course: courseInclude,
      },
      orderBy: [{ year: "desc" }, { student: { firstName: "asc" } }],
    });

    return NextResponse.json(records);
  } catch (e) {
    console.error("Exam records list error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { studentId, courseId, year, scores: scoresBody } = body;

    const parsedStudentId = Number(studentId);
    const parsedCourseId = Number(courseId);
    const parsedYear = Number(year);

    if (!Number.isInteger(parsedStudentId) || !Number.isInteger(parsedCourseId) || !Number.isInteger(parsedYear)) {
      return NextResponse.json({ error: "studentId, courseId, and year are required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: parsedStudentId },
      select: { id: true, classId: true, status: true },
    });
    if (!student || student.status !== "Admitted") {
      return NextResponse.json({ error: "Student not found or not admitted" }, { status: 404 });
    }
    if (!student.classId) {
      return NextResponse.json(
        { error: "Student must be assigned to a class before recording exams" },
        { status: 400 }
      );
    }

    await seedDefaultAssessmentsIfEmpty(parsedCourseId, student.classId);

    const assessments = await loadAssessmentsForClassCourse(
      parsedCourseId,
      student.classId
    );

    const rawScores =
      scoresBody && typeof scoresBody === "object" && !Array.isArray(scoresBody)
        ? (scoresBody as Record<string, number>)
        : {};

    const { scores, error } = normalizeScoresForCourse(rawScores, assessments);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const totalMarks = calculateTotalFromScoreMap(scores);
    const { grade, gradePoints } = getGradeInfo(totalMarks);

    const existing = await prisma.examRecord.findUnique({
      where: {
        studentId_courseId_year: {
          studentId: parsedStudentId,
          courseId: parsedCourseId,
          year: parsedYear,
        },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Exam record for this student/course/year already exists" }, { status: 400 });
    }

    const record = await prisma.examRecord.create({
      data: {
        studentId: parsedStudentId,
        courseId: parsedCourseId,
        year: parsedYear,
        scores,
        totalMarks,
        grade,
        gradePoints,
      },
      include: {
        student: {
          select: { id: true, studentId: true, firstName: true, lastName: true, imageUrl: true },
        },
        course: courseInclude,
      },
    });

    return NextResponse.json(record);
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Duplicate exam record for this student/course/year" }, { status: 400 });
    }
    console.error("Create exam record error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
