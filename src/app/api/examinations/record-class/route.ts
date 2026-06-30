import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchClassCourseAttendanceSummary } from "@/lib/exam-attendance";
import { computeExamRecordTotals, resolveExamYear } from "@/lib/exam-records";
import { findAttendanceAssessmentKey, parseScoresJson } from "@/lib/course-assessments";
import {
  loadAssessmentsForClassCourse,
  seedDefaultAssessmentsIfEmpty,
} from "@/lib/course-assessment-scope";

/**
 * GET /api/examinations/record-class?classId=X&courseId=Y
 * Returns class + course (with assessments) + students + draft scores rows.
 * Attendance marks are computed from stored attendance sessions for this course.
 * Grade and GPA points are derived automatically from total marks.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const courseId = searchParams.get("courseId");
    if (!classId || !courseId) {
      return NextResponse.json(
        { error: "classId and courseId are required" },
        { status: 400 }
      );
    }

    const parsedClassId = Number(classId);
    const parsedCourseId = Number(courseId);
    if (!Number.isInteger(parsedClassId) || !Number.isInteger(parsedCourseId)) {
      return NextResponse.json({ error: "Invalid classId or courseId" }, { status: 400 });
    }

    const examYear = resolveExamYear(searchParams.get("year"));

    const cls = await prisma.class.findUnique({
      where: { id: parsedClassId },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const course = await prisma.course.findUnique({
      where: { id: parsedCourseId },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    if (!course || course.departmentId !== cls.departmentId) {
      return NextResponse.json(
        { error: "Course not found or does not belong to the class's department" },
        { status: 400 }
      );
    }

    await seedDefaultAssessmentsIfEmpty(parsedCourseId, parsedClassId);

    const assessments = await loadAssessmentsForClassCourse(
      parsedCourseId,
      parsedClassId
    );

    const students = await prisma.student.findMany({
      where: { classId: parsedClassId, status: "Admitted" },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        imageUrl: true,
      },
      orderBy: [{ studentId: "asc" }],
    });

    const studentIds = students.map((s) => s.id);

    const examRecords = await prisma.examRecord.findMany({
      where: {
        studentId: { in: studentIds },
        courseId: parsedCourseId,
        year: examYear,
      },
      select: {
        studentId: true,
        scores: true,
      },
    });
    const examByStudent = new Map(examRecords.map((r) => [r.studentId, r]));

    const { totalSessions, byStudent: attendanceByStudent } =
      await fetchClassCourseAttendanceSummary(
        parsedClassId,
        parsedCourseId,
        studentIds
      );

    const attendanceKey = findAttendanceAssessmentKey(assessments);

    const rows = students.map((s) => {
      const exam = examByStudent.get(s.id);
      const agg = attendanceByStudent.get(s.id) ?? {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        attendancePercent: 0,
        attendanceMarks: 0,
      };

      const baseScores: Record<string, number> = {};
      for (const a of assessments) {
        baseScores[a.key] = 0;
      }
      if (exam) {
        const saved = parseScoresJson(exam.scores);
        for (const a of assessments) {
          if (saved[a.key] !== undefined) {
            baseScores[a.key] = saved[a.key];
          }
        }
      }

      const totals = computeExamRecordTotals(
        baseScores,
        agg.attendanceMarks,
        assessments
      );

      return {
        student: {
          id: s.id,
          studentId: s.studentId,
          firstName: s.firstName,
          lastName: s.lastName,
          imageUrl: s.imageUrl,
        },
        attendance: {
          present: agg.present,
          absent: agg.absent,
          late: agg.late,
          excused: agg.excused,
          totalSessions,
          attendancePercent: agg.attendancePercent,
          attendanceMarks: agg.attendanceMarks,
        },
        record: totals,
        attendanceAssessmentKey: attendanceKey,
      };
    });

    return NextResponse.json({
      class: {
        id: cls.id,
        name: cls.name,
        department: cls.department,
      },
      course: {
        id: course.id,
        name: course.name,
        code: course.code,
        creditHours: course.creditHours,
        department: course.department,
        assessments,
      },
      attendanceAssessmentKey: attendanceKey,
      totalSessions,
      rows,
    });
  } catch (e) {
    console.error("Record class error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
