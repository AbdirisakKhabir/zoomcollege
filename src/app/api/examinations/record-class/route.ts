import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computeAttendanceMarks,
  computeAttendancePercent,
} from "@/lib/attendance";
import { getSemesterDateRange } from "@/lib/semester-dates";
import { calculateTotalFromScoreMap } from "@/lib/grades";
import { normalizeScoresForCourse, parseScoresJson } from "@/lib/course-assessments";
import { seedDefaultAssessmentsIfEmpty } from "@/lib/seed-course-assessments";

/**
 * GET /api/examinations/record-class?classId=X&courseId=Y
 * Returns class + course (with assessments) + students + draft scores rows.
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

    await seedDefaultAssessmentsIfEmpty(parsedCourseId);

    const assessments = await prisma.courseAssessment.findMany({
      where: { courseId: parsedCourseId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

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
        semester: cls.semester,
        year: cls.year,
      },
      select: {
        studentId: true,
        scores: true,
        totalMarks: true,
        grade: true,
        gradePoints: true,
      },
    });
    const examByStudent = new Map(examRecords.map((r) => [r.studentId, r]));

    const { start, end } = getSemesterDateRange(cls.semester, cls.year);
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        classId: parsedClassId,
        date: { gte: start, lte: end },
      },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);
    const totalSessions = sessionIds.length;

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        sessionId: { in: sessionIds },
        studentId: { in: studentIds },
      },
      select: { sessionId: true, studentId: true, status: true },
    });

    const byStudent = new Map<
      number,
      { present: number; absent: number; late: number; excused: number }
    >();
    for (const s of students) {
      byStudent.set(s.id, { present: 0, absent: 0, late: 0, excused: 0 });
    }
    for (const r of attendanceRecords) {
      const agg = byStudent.get(r.studentId);
      if (!agg) continue;
      if (r.status === "Present") agg.present++;
      else if (r.status === "Absent") agg.absent++;
      else if (r.status === "Late") agg.late++;
      else if (r.status === "Excused") agg.excused++;
    }

    const rows = students.map((s) => {
      const exam = examByStudent.get(s.id);
      const agg = byStudent.get(s.id) ?? {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      };
      const presentPlusExcused = agg.present + agg.excused;
      const attendancePercent = computeAttendancePercent(
        presentPlusExcused,
        totalSessions
      );
      const attendanceMarks = computeAttendanceMarks(
        presentPlusExcused,
        totalSessions
      );

      if (exam) {
        const scores = parseScoresJson(exam.scores);
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
            attendancePercent,
            attendanceMarks,
          },
          record: {
            scores,
            totalMarks: exam.totalMarks ?? 0,
            grade: exam.grade ?? "",
            gradePoints: exam.gradePoints ?? 0,
          },
        };
      }

      const draftScores: Record<string, number> = {};
      for (const a of assessments) {
        draftScores[a.key] = 0;
      }
      const pres = assessments.find((a) => a.key === "presentation");
      if (pres) {
        draftScores.presentation = attendanceMarks;
      }

      const { scores: normalized } = normalizeScoresForCourse(draftScores, assessments);
      const totalMarks = calculateTotalFromScoreMap(normalized);

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
          attendancePercent,
          attendanceMarks,
        },
        record: {
          scores: normalized,
          totalMarks,
          grade: "",
          gradePoints: 0,
        },
      };
    });

    return NextResponse.json({
      class: {
        id: cls.id,
        name: cls.name,
        semester: cls.semester,
        year: cls.year,
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
      totalSessions,
      rows,
    });
  } catch (e) {
    console.error("Record class error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
