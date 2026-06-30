import {
  applyAttendanceToScores,
  CourseAssessmentLike,
  normalizeScoresForCourse,
} from "@/lib/course-assessments";
import { calculateTotalFromScoreMap, getGradeInfo } from "@/lib/grades";

export function resolveExamYear(yearParam: unknown): number {
  const y = Number(yearParam);
  return Number.isInteger(y) && y > 0 ? y : new Date().getFullYear();
}

/** Apply attendance marks, sum components, and derive letter grade + GPA points. */
export function computeExamRecordTotals(
  rawScores: Record<string, number>,
  attendanceMarks: number,
  assessments: CourseAssessmentLike[]
): {
  scores: Record<string, number>;
  totalMarks: number;
  grade: string;
  gradePoints: number;
} {
  const withAttendance = applyAttendanceToScores(
    rawScores,
    attendanceMarks,
    assessments
  );
  const { scores } = normalizeScoresForCourse(withAttendance, assessments);
  const totalMarks = calculateTotalFromScoreMap(scores);
  const { grade, gradePoints } = getGradeInfo(totalMarks);
  return { scores, totalMarks, grade, gradePoints };
}
