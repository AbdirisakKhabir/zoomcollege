import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { calculateTotalFromScoreMap, getGradeInfo, getGradePointsFromGrade } from "@/lib/grades";
import { seedDefaultAssessmentsIfEmpty } from "@/lib/seed-course-assessments";

function findCol(headerRow: string[], patterns: RegExp[]): number {
  for (const p of patterns) {
    const idx = headerRow.findIndex((h) => p.test(String(h).trim()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Resolve Excel column for a course assessment + legacy aliases. */
function colIndexForAssessment(
  headerRow: string[],
  a: { name: string; key: string }
): number {
  const patterns: RegExp[] = [
    new RegExp(`^${escapeRe(a.name)}\\s*(\\([0-9.]+%\\))?$`, "i"),
    new RegExp(`^${escapeRe(a.key)}$`, "i"),
  ];
  if (a.key === "midExam") {
    patterns.push(/^mid\s*term$/i, /^mid\s*exam/i, /^mid$/i);
  }
  if (a.key === "finalExam") {
    patterns.push(/^final$/i, /^final\s*exam/i);
  }
  if (a.key === "assignment") {
    patterns.push(/^assignment1$/i, /^assign1$/i, /^assignment$/i);
  }
  if (a.key === "project") {
    patterns.push(/^assignment2$/i, /^assign2$/i);
  }
  if (a.key === "presentation") {
    patterns.push(/^attendance$/i, /^attedance$/i);
  }
  if (a.key === "assessment") {
    patterns.push(/^quiz$/i);
  }
  return findCol(headerRow, patterns);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const classId = formData.get("classId") as string | null;
    const courseId = formData.get("courseId") as string | null;

    if (!file || !classId || !courseId) {
      return NextResponse.json(
        { error: "file, classId, and courseId are required" },
        { status: 400 }
      );
    }

    const cls = await prisma.class.findUnique({
      where: { id: Number(classId) },
      select: { id: true, departmentId: true, semester: true, year: true },
    });

    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const course = await prisma.course.findUnique({
      where: { id: Number(courseId) },
    });
    if (!course || course.departmentId !== cls.departmentId) {
      return NextResponse.json(
        { error: "Course not found or does not belong to the class's department" },
        { status: 400 }
      );
    }

    await seedDefaultAssessmentsIfEmpty(course.id);

    const assessments = await prisma.courseAssessment.findMany({
      where: { courseId: course.id },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as (string | number)[][];

    if (!data || data.length < 2) {
      return NextResponse.json(
        { error: "Excel file must have a header row and at least one student row" },
        { status: 400 }
      );
    }

    let headerRow: string[] = [];
    let dataStartRow = 1;
    const studentIdPatterns = [/^id\s*card$/i, /^student\s*id$/i, /^studentid$/i];
    for (let r = 0; r < Math.min(15, data.length); r++) {
      const row = (data[r] as string[]).map((h) => String(h ?? "").trim());
      if (findCol(row, studentIdPatterns) >= 0) {
        headerRow = row;
        dataStartRow = r + 1;
        break;
      }
    }
    if (headerRow.length === 0) {
      return NextResponse.json(
        { error: "Excel must contain an 'ID Card' or 'Student ID' column" },
        { status: 400 }
      );
    }

    const studentIdIdx = findCol(headerRow, studentIdPatterns);
    if (studentIdIdx < 0) {
      return NextResponse.json(
        { error: "Excel must contain an 'ID Card' or 'Student ID' column" },
        { status: 400 }
      );
    }

    const assessmentColIdx = assessments.map((a) => ({
      key: a.key,
      max: a.weightPercent,
      idx: colIndexForAssessment(headerRow, a),
    }));

    const totalIdx = findCol(headerRow, [/^total$/i]);
    const gradeIdx = findCol(headerRow, [/^grade$/i]);
    const gpaIdx = findCol(headerRow, [/^gpa$/i]);

    const created: number[] = [];
    const updated: number[] = [];
    const errors: string[] = [];

    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i] as (string | number)[];
      if (!row || row.length === 0) continue;

      const studentIdStr = String(row[studentIdIdx] ?? "").trim();
      if (!studentIdStr) continue;

      const student = await prisma.student.findUnique({
        where: { studentId: studentIdStr },
        select: { id: true },
      });

      if (!student) {
        errors.push(`Row ${i + 1}: Student "${studentIdStr}" not found`);
        continue;
      }

      const scores: Record<string, number> = {};
      let rowInvalid = false;
      for (const ac of assessmentColIdx) {
        const raw = ac.idx >= 0 ? row[ac.idx] : "";
        const n = parseNum(raw);
        if (n < 0 || n > ac.max + 1e-6) {
          errors.push(
            `Row ${i + 1}: ${ac.key} must be between 0 and ${ac.max}`
          );
          rowInvalid = true;
          break;
        }
        scores[ac.key] = n;
      }
      if (rowInvalid) continue;

      let totalMarks: number;
      let grade: string;
      let gradePoints: number;

      const fileTotal = totalIdx >= 0 ? parseNumOrNull(row[totalIdx]) : null;
      const fileGrade = gradeIdx >= 0 ? String(row[gradeIdx] ?? "").trim() : "";
      const fileGpa = gpaIdx >= 0 ? parseNumOrNull(row[gpaIdx]) : null;

      totalMarks =
        fileTotal !== null && fileTotal >= 0 ? fileTotal : calculateTotalFromScoreMap(scores);

      if (fileGrade && /^[A-D][+-]?|F$/i.test(fileGrade)) {
        grade = fileGrade.toUpperCase().replace(/^([A-D])$/, "$1");
        const pts = getGradePointsFromGrade(grade);
        gradePoints = fileGpa !== null ? fileGpa : pts ?? 0;
      } else {
        const info = getGradeInfo(totalMarks);
        grade = info.grade;
        gradePoints = info.gradePoints;
      }

      const existing = await prisma.examRecord.findUnique({
        where: {
          studentId_courseId_semester_year: {
            studentId: student.id,
            courseId: course.id,
            semester: cls.semester,
            year: cls.year,
          },
        },
      });

      if (existing) {
        await prisma.examRecord.update({
          where: { id: existing.id },
          data: { scores, totalMarks, grade, gradePoints, status: "draft" },
        });
        updated.push(existing.id);
      } else {
        const rec = await prisma.examRecord.create({
          data: {
            studentId: student.id,
            courseId: course.id,
            semester: cls.semester,
            year: cls.year,
            scores,
            totalMarks,
            grade,
            gradePoints,
            status: "draft",
          },
        });
        created.push(rec.id);
      }
    }

    return NextResponse.json({
      created: created.length,
      updated: updated.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    console.error("Exam import error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

function parseNum(val: string | number | undefined): number {
  if (val === undefined || val === null || val === "") return 0;
  const n = Number(val);
  return Number.isNaN(n) ? 0 : n;
}

function parseNumOrNull(val: string | number | undefined): number | null {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}
