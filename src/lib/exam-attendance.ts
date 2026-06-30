import { prisma } from "@/lib/prisma";
import {
  computeAttendanceMarks,
  computeAttendancePercent,
} from "@/lib/attendance";

export type StudentAttendanceAgg = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendancePercent: number;
  attendanceMarks: number;
};

export type ClassCourseAttendanceSummary = {
  totalSessions: number;
  byStudent: Map<number, StudentAttendanceAgg>;
};

function emptyAgg(): StudentAttendanceAgg {
  return {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attendancePercent: 0,
    attendanceMarks: 0,
  };
}

/**
 * Resolve attendance session IDs for a class + course.
 * 1. Prefer sessions recorded for this exact course.
 * 2. If none, fall back to all class sessions when attendance was only tracked at class level
 *    (single courseId on all sessions — common after migration or before per-course attendance).
 */
export async function resolveAttendanceSessionIds(
  classId: number,
  courseId: number
): Promise<number[]> {
  const courseSessions = await prisma.attendanceSession.findMany({
    where: { classId, courseId },
    select: { id: true },
    orderBy: [{ date: "asc" }, { shift: "asc" }],
  });

  if (courseSessions.length > 0) {
    return courseSessions.map((s) => s.id);
  }

  const classSessions = await prisma.attendanceSession.findMany({
    where: { classId },
    select: { id: true, courseId: true },
    orderBy: [{ date: "asc" }, { shift: "asc" }],
  });

  if (classSessions.length === 0) {
    return [];
  }

  const distinctCourseIds = new Set(classSessions.map((s) => s.courseId));

  // Legacy: every session for this class shares one course — apply class attendance to any course.
  if (distinctCourseIds.size === 1) {
    return classSessions.map((s) => s.id);
  }

  return [];
}

/** Attendance totals from stored sessions for a class + course. */
export async function fetchClassCourseAttendanceSummary(
  classId: number,
  courseId: number,
  studentIds: number[]
): Promise<ClassCourseAttendanceSummary> {
  const byStudent = new Map<number, StudentAttendanceAgg>();
  for (const id of studentIds) {
    byStudent.set(id, emptyAgg());
  }

  if (studentIds.length === 0) {
    return { totalSessions: 0, byStudent };
  }

  const sessionIds = await resolveAttendanceSessionIds(classId, courseId);
  const totalSessions = sessionIds.length;

  if (totalSessions === 0) {
    return { totalSessions: 0, byStudent };
  }

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      sessionId: { in: sessionIds },
      studentId: { in: studentIds },
    },
    select: { studentId: true, status: true },
  });

  for (const r of attendanceRecords) {
    const agg = byStudent.get(r.studentId);
    if (!agg) continue;
    if (r.status === "Present") agg.present++;
    else if (r.status === "Absent") agg.absent++;
    else if (r.status === "Late") agg.late++;
    else if (r.status === "Excused") agg.excused++;
  }

  for (const agg of byStudent.values()) {
    const presentPlusExcused = agg.present + agg.excused;
    agg.attendancePercent = computeAttendancePercent(
      presentPlusExcused,
      totalSessions
    );
    agg.attendanceMarks = computeAttendanceMarks(
      presentPlusExcused,
      totalSessions
    );
  }

  return { totalSessions, byStudent };
}
