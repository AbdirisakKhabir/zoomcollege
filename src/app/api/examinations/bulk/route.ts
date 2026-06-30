import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeScoresForCourse } from "@/lib/course-assessments";
import {
  loadAssessmentsForClassCourse,
  seedDefaultAssessmentsIfEmpty,
} from "@/lib/course-assessment-scope";
import { fetchClassCourseAttendanceSummary } from "@/lib/exam-attendance";
import { computeExamRecordTotals, resolveExamYear } from "@/lib/exam-records";

type RecordInput = {
  studentId: number;
  scores?: Record<string, number>;
  midExam?: number;
  finalExam?: number;
  assessment?: number;
  project?: number;
  assignment?: number;
  presentation?: number;
  totalMarks?: number;
  grade?: string;
  gradePoints?: number;
};

function scoresFromPayload(r: RecordInput): Record<string, number> {
  if (r.scores && typeof r.scores === "object" && !Array.isArray(r.scores)) {
    return { ...r.scores };
  }
  const o: Record<string, number> = {};
  if (r.midExam !== undefined) o.midExam = Number(r.midExam);
  if (r.finalExam !== undefined) o.finalExam = Number(r.finalExam);
  if (r.assessment !== undefined) o.assessment = Number(r.assessment);
  if (r.project !== undefined) o.project = Number(r.project);
  if (r.assignment !== undefined) o.assignment = Number(r.assignment);
  if (r.presentation !== undefined) o.presentation = Number(r.presentation);
  return o;
}

/**
 * POST /api/examinations/bulk
 * Body: { classId, courseId, records: RecordInput[], status: "draft" | "approved" }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { classId, courseId, records, status, year } = body as {
      classId: number;
      courseId: number;
      records: RecordInput[];
      status: "draft" | "approved";
      year?: number;
    };

    if (!classId || !courseId || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "classId, courseId, and records array are required" },
        { status: 400 }
      );
    }

    if (status !== "draft" && status !== "approved") {
      return NextResponse.json(
        { error: "status must be 'draft' or 'approved'" },
        { status: 400 }
      );
    }

    const cls = await prisma.class.findUnique({
      where: { id: Number(classId) },
      select: { id: true, departmentId: true },
    });

    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const examYear = resolveExamYear(year);

    const course = await prisma.course.findUnique({
      where: { id: Number(courseId) },
    });
    if (!course || course.departmentId !== cls.departmentId) {
      return NextResponse.json(
        { error: "Course not found or does not belong to the class's department" },
        { status: 400 }
      );
    }

    const effectiveCourseId = course.id;

    await seedDefaultAssessmentsIfEmpty(effectiveCourseId, cls.id);

    const assessments = await loadAssessmentsForClassCourse(
      effectiveCourseId,
      cls.id
    );

    const studentIds = records
      .map((r) => Number(r.studentId))
      .filter((id) => Number.isInteger(id));

    const { byStudent: attendanceByStudent } =
      await fetchClassCourseAttendanceSummary(
        cls.id,
        effectiveCourseId,
        studentIds
      );

    const created: number[] = [];
    const updated: number[] = [];
    const errors: string[] = [];

    for (const r of records) {
      const studentId = Number(r.studentId);
      if (!Number.isInteger(studentId)) {
        errors.push(`Invalid studentId: ${r.studentId}`);
        continue;
      }

      const raw = scoresFromPayload(r);
      const { scores: normalizedInput, error } = normalizeScoresForCourse(
        raw,
        assessments
      );
      if (error) {
        errors.push(`Student ${studentId}: ${error}`);
        continue;
      }

      const attendanceAgg = attendanceByStudent.get(studentId);
      const attendanceMarks = attendanceAgg?.attendanceMarks ?? 0;
      const { scores, totalMarks, grade, gradePoints } = computeExamRecordTotals(
        normalizedInput,
        attendanceMarks,
        assessments
      );

      const existing = await prisma.examRecord.findUnique({
        where: {
          studentId_courseId_year: {
            studentId,
            courseId: effectiveCourseId,
            year: examYear,
          },
        },
      });

      const data = {
        scores,
        totalMarks,
        grade,
        gradePoints,
        status,
      };

      if (existing) {
        await prisma.examRecord.update({
          where: { id: existing.id },
          data,
        });
        updated.push(existing.id);
      } else {
        const rec = await prisma.examRecord.create({
          data: {
            studentId,
            courseId: effectiveCourseId,
            year: examYear,
            ...data,
          },
        });
        created.push(rec.id);
      }
    }

    return NextResponse.json({
      created: created.length,
      updated: updated.length,
      status,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    console.error("Bulk exam save error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
