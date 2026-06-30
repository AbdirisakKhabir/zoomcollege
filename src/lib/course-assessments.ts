/**
 * Per-course assessment weights (percent of 100). Max marks for each component = weightPercent.
 */

export type CourseAssessmentLike = {
  key: string;
  name: string;
  weightPercent: number;
  sortOrder: number;
};

export const DEFAULT_ASSESSMENT_BLUEPRINT: {
  name: string;
  key: string;
  weightPercent: number;
  sortOrder: number;
}[] = [
  { name: "Mid Exam", key: "midExam", weightPercent: 20, sortOrder: 0 },
  { name: "Final Exam", key: "finalExam", weightPercent: 40, sortOrder: 1 },
  { name: "Assessment", key: "assessment", weightPercent: 10, sortOrder: 2 },
  { name: "Project", key: "project", weightPercent: 10, sortOrder: 3 },
  { name: "Assignment", key: "assignment", weightPercent: 10, sortOrder: 4 },
  { name: "Presentation", key: "presentation", weightPercent: 10, sortOrder: 5 },
];

const KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export function isValidAssessmentKey(key: string): boolean {
  return KEY_RE.test(String(key).trim());
}

/** Assessment key used for attendance marks (10% component). */
export function findAttendanceAssessmentKey(
  assessments: CourseAssessmentLike[]
): string | null {
  const exact = assessments.find(
    (a) => a.key === "attendance" || a.key === "presentation"
  );
  if (exact) return exact.key;
  const byName = assessments.find((a) =>
    /attendance|presentation/i.test(a.name)
  );
  return byName?.key ?? null;
}

/** Inject computed attendance marks into the scores map. */
export function applyAttendanceToScores(
  scores: Record<string, number>,
  attendanceMarks: number,
  assessments: CourseAssessmentLike[]
): Record<string, number> {
  const key = findAttendanceAssessmentKey(assessments);
  if (!key) return { ...scores };
  return { ...scores, [key]: attendanceMarks };
}

export function parseScoresJson(raw: unknown): Record<string, number> {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return parseScoresJson(p);
    } catch {
      return {};
    }
  }
  if (typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

export function validateWeightsSum(items: { weightPercent: number }[]): string | null {
  const sum = items.reduce((a, i) => a + (Number(i.weightPercent) || 0), 0);
  if (Math.abs(sum - 100) > 0.01) {
    return `Assessment weights must sum to 100% (currently ${sum.toFixed(2)}%).`;
  }
  return null;
}

/**
 * Clamp and validate scores against course assessments. Unknown keys are dropped.
 * Returns error message or null if OK.
 */
export function normalizeScoresForCourse(
  raw: Record<string, number> | null | undefined,
  assessments: CourseAssessmentLike[]
): { scores: Record<string, number>; error: string | null } {
  const byKey = new Map(assessments.map((a) => [a.key, a]));
  const scores: Record<string, number> = {};
  const input = raw ?? {};
  for (const a of assessments) {
    const v = input[a.key];
    const num = v === undefined || v === null ? 0 : Number(v);
    if (!Number.isFinite(num)) {
      return { scores: {}, error: `Invalid mark for "${a.name}"` };
    }
    const max = a.weightPercent;
    if (num < 0 || num > max + 1e-6) {
      return {
        scores: {},
        error: `${a.name} must be between 0 and ${max} (weight ${max}%).`,
      };
    }
    scores[a.key] = Math.round(num * 100) / 100;
  }
  for (const k of Object.keys(input)) {
    if (!byKey.has(k) && input[k] != null && Number(input[k]) !== 0) {
      // ignore unknown keys with zero / missing
    }
  }
  return { scores, error: null };
}

/** Merge partial patch into existing scores (same validation). Only keys in assessments are applied. */
export function mergeScores(
  existing: Record<string, number>,
  patch: Record<string, number | undefined> | null | undefined,
  assessments: CourseAssessmentLike[]
): { scores: Record<string, number>; error: string | null } {
  const next: Record<string, number> = { ...existing };
  if (patch) {
    for (const a of assessments) {
      if (patch[a.key] !== undefined) {
        next[a.key] = Number(patch[a.key]);
      }
    }
  }
  return normalizeScoresForCourse(next, assessments);
}
