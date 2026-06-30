// Grade scale for Zoom International College
// Mark breakdown (default max marks):
//   Mid Exam:      /20
//   Final Exam:    /40
//   Assessment:    /10
//   Project:       /10
//   Assignment:    /10
//   Presentation:  /10
//   Total:         /100

export interface GradeInfo {
  grade: string;
  gradePoints: number;
}

export const GRADE_SCALE: { min: number; grade: string; points: number }[] = [
  { min: 90, grade: "A",  points: 4.0 },
  { min: 85, grade: "A-", points: 3.7 },
  { min: 80, grade: "B+", points: 3.3 },
  { min: 75, grade: "B",  points: 3.0 },
  { min: 70, grade: "B-", points: 2.7 },
  { min: 65, grade: "C+", points: 2.3 },
  { min: 60, grade: "C",  points: 2.0 },
  { min: 50, grade: "D",  points: 1.0 },
  { min: 0,  grade: "F",  points: 0.0 },
];

export const MARK_COMPONENTS = [
  { key: "midExam",      label: "Mid Exam",      maxMarks: 20 },
  { key: "finalExam",    label: "Final Exam",     maxMarks: 40 },
  { key: "assessment",   label: "Assessment",     maxMarks: 10 },
  { key: "project",      label: "Project",        maxMarks: 10 },
  { key: "assignment",   label: "Assignment",     maxMarks: 10 },
  { key: "presentation", label: "Presentation",   maxMarks: 10 },
] as const;

/** Sum of numeric values in a scores map (course assessment marks). */
export function calculateTotalFromScoreMap(scores: Record<string, number>): number {
  let t = 0;
  for (const v of Object.values(scores)) {
    t += v ?? 0;
  }
  return Math.round(t * 100) / 100;
}

export function getGradeInfo(totalMarks: number): GradeInfo {
  for (const g of GRADE_SCALE) {
    if (totalMarks >= g.min) {
      return { grade: g.grade, gradePoints: g.points };
    }
  }
  return { grade: "F", gradePoints: 0.0 };
}

/** Parse grade letter (A, B+, F, etc.) to grade points. Returns null if unknown. */
export function getGradePointsFromGrade(gradeStr: string): number | null {
  const normalized = String(gradeStr || "").trim().toUpperCase();
  const entry = GRADE_SCALE.find((g) => g.grade.toUpperCase() === normalized);
  return entry ? entry.points : null;
}

export interface YearGPA {
  year: number;
  gpa: number;
  totalCredits: number;
  totalGradePoints: number;
  courses: number;
}

export interface GPASummary {
  cumulativeGPA: number;
  totalCredits: number;
  years: YearGPA[];
}

export function calculateGPA(
  records: {
    year: number;
    gradePoints: number | null;
    creditHours: number;
  }[]
): GPASummary {
  const yearMap = new Map<number, { items: { gradePoints: number; creditHours: number }[] }>();

  for (const r of records) {
    if (!yearMap.has(r.year)) {
      yearMap.set(r.year, { items: [] });
    }
    yearMap.get(r.year)!.items.push({
      gradePoints: r.gradePoints || 0,
      creditHours: r.creditHours,
    });
  }

  const years: YearGPA[] = [];
  let cumulativeTotalCredits = 0;
  let cumulativeTotalGradePoints = 0;

  const sortedYears = [...yearMap.keys()].sort((a, b) => a - b);

  for (const year of sortedYears) {
    const items = yearMap.get(year)!.items;
    let totalCredits = 0;
    let totalGradePoints = 0;
    for (const item of items) {
      totalCredits += item.creditHours;
      totalGradePoints += item.gradePoints * item.creditHours;
    }
    const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
    years.push({
      year,
      gpa: Math.round(gpa * 100) / 100,
      totalCredits,
      totalGradePoints: Math.round(totalGradePoints * 100) / 100,
      courses: items.length,
    });
    cumulativeTotalCredits += totalCredits;
    cumulativeTotalGradePoints += totalGradePoints;
  }

  const cumulativeGPA =
    cumulativeTotalCredits > 0
      ? Math.round((cumulativeTotalGradePoints / cumulativeTotalCredits) * 100) / 100
      : 0;

  return {
    cumulativeGPA,
    totalCredits: cumulativeTotalCredits,
    years,
  };
}

/** Sort exam records chronologically by year. */
export function sortExamRecordsByYear<T extends { year: number }>(records: T[]): T[] {
  return [...records].sort((a, b) => a.year - b.year);
}
