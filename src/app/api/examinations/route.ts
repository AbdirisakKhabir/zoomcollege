import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateTotalFromScoreMap, getGradeInfo } from "@/lib/grades";
import { isValidSemester } from "@/lib/semesters";
import { normalizeScoresForCourse } from "@/lib/course-assessments";
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

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const courseId = searchParams.get("courseId");
    const semester = searchParams.get("semester");
    const year = searchParams.get("year");

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = Number(studentId);
    if (courseId) where.courseId = Number(courseId);
    if (semester) where.semester = semester;
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
      orderBy: [{ year: "desc" }, { semester: "asc" }, { student: { firstName: "asc" } }],
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
    const { studentId, courseId, semester, year, scores: scoresBody } = body;

    const parsedStudentId = Number(studentId);
    const parsedCourseId = Number(courseId);
    const parsedYear = Number(year);

    if (!Number.isInteger(parsedStudentId) || !Number.isInteger(parsedCourseId) || !semester || !Number.isInteger(parsedYear)) {
      return NextResponse.json({ error: "studentId, courseId, semester, and year are required" }, { status: 400 });
    }

    if (!(await isValidSemester(semester))) {
      return NextResponse.json({ error: "Invalid semester. Use a semester from the Semesters settings." }, { status: 400 });
    }

    await seedDefaultAssessmentsIfEmpty(parsedCourseId);

    const assessments = await prisma.courseAssessment.findMany({
      where: { courseId: parsedCourseId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

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
        studentId_courseId_semester_year: {
          studentId: parsedStudentId,
          courseId: parsedCourseId,
          semester,
          year: parsedYear,
        },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Exam record for this student/course/semester/year already exists" }, { status: 400 });
    }

    const record = await prisma.examRecord.create({
      data: {
        studentId: parsedStudentId,
        courseId: parsedCourseId,
        semester,
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
      return NextResponse.json({ error: "Duplicate exam record for this student/course/semester/year" }, { status: 400 });
    }
    console.error("Create exam record error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
