"use client";

import React from "react";
import Button from "@/components/ui/button/Button";
import { TRANSCRIPT_BRAND, GRADING_SYSTEM_LEGEND } from "@/lib/transcript-brand";

/** Official banner (uploaded registrar header) */
const TRANSCRIPT_HEADER_IMAGE = "/logo/transcript-header.png";

/** Body font: Cambria (+1px vs prior compact sizing) */
const transcriptFont = "font-['Cambria',Georgia,'Times_New_Roman',serif]";

/** Compact table cells so a full transcript fits ~2 printed pages */
const cellBorder =
  "border border-black px-1 py-0.5 text-[11px] leading-tight print:text-[10px] print:leading-tight";
const tableHeaderCell = `${cellBorder} bg-white font-bold text-black`;

/** Course / marks table column headers (brand maroon) — body cells stay plain white; no low-mark fill */
const courseGradeTableHeaderCell = `${cellBorder} border-black bg-[#a53851] font-bold text-white print:bg-[#a53851] print:text-white`;

/** Academic year line above each course table */
const YEAR_HEAD_BG = "#e8e8e8";

const yearHeadingLineClass = `transcript-year-title-row border-b border-black px-2 py-1.5 text-left text-[12px] font-bold text-black underline print:border-black print:py-1 print:text-[11px]`;

/** Fixed % widths so every year table lines up (Course Code | Title | CrHrs | Marks | Grade | GPA) */
const YEAR_GRADES_COL_PCTS = ["16%", "36%", "8%", "14%", "10%", "16%"] as const;

/** Student info block (top left): more breathing room per row */
const infoCell =
  "border border-black px-2 py-2 text-[11px] leading-snug print:px-2 print:py-1.5 print:text-[10px]";

type ExamRecord = {
  id: number;
  year: number;
  totalMarks: number;
  grade: string | null;
  gradePoints: number | null;
  course: { code: string; name: string; creditHours: number };
};

type StudentInfo = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  admissionDate?: string | Date;
  department?: {
    id: number;
    name: string;
    code: string;
  };
};

type YearGPA = {
  year: number;
  gpa: number;
  totalCredits: number;
  totalGradePoints: number;
  courses: number;
};

type TranscriptDocumentProps = {
  student: StudentInfo;
  recordsByYear: Record<string, ExamRecord[]>;
  yearKeys: string[];
  yearGpaMap: Record<string, YearGPA>;
  cumulativeGPA: number;
  totalCredits: number;
  /** Show a Print Transcript button above the document (hidden when printing) */
  showPrintButton?: boolean;
};

/** e.g. "Academic Year: 2022-2023" */
function formatAcademicYearLine(yearEnd: number): string {
  return `Academic Year: ${yearEnd - 1}-${yearEnd}`;
}

/** Earliest calendar year appearing on the transcript (from graded years). */
function earliestTranscriptYear(yearKeys: string[]): number | null {
  let min = Infinity;
  for (const k of yearKeys) {
    const y = Number(k);
    if (y > 0 && y < min) min = y;
  }
  return min === Infinity ? null : min;
}

/** Calendar year from stored admission date (ISO YYYY-MM-DD uses the date, not UTC shift). */
function yearFromAdmissionDate(d: string | Date): number | null {
  const s = typeof d === "string" ? d.trim() : new Date(d).toISOString().slice(0, 10);
  const iso = /^(\d{4})-\d{2}-\d{2}/.exec(s);
  if (iso) return Number(iso[1]);
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(d).getFullYear();
}

function formatEntryYear(
  yearKeys: string[],
  admissionDate: string | Date | undefined
): string {
  const fromGrades = earliestTranscriptYear(yearKeys);
  if (fromGrades != null) return String(fromGrades);
  if (admissionDate) {
    const y = yearFromAdmissionDate(admissionDate);
    if (y != null) return String(y);
  }
  return "—";
}

export function TranscriptDocument({
  student,
  recordsByYear,
  yearKeys,
  yearGpaMap,
  cumulativeGPA,
  totalCredits,
  showPrintButton = false,
}: TranscriptDocumentProps) {
  const college = TRANSCRIPT_BRAND.universityName;
  const department = student.department?.name ?? "—";
  const studentName = `${student.firstName} ${student.lastName}`;
  const entryYear =
    typeof TRANSCRIPT_BRAND.entryYearDisplay === "string" &&
    TRANSCRIPT_BRAND.entryYearDisplay.trim() !== ""
      ? TRANSCRIPT_BRAND.entryYearDisplay.trim()
      : formatEntryYear(yearKeys, student.admissionDate);

  const legendHeading = `${TRANSCRIPT_BRAND.gradingSystemTitle.endsWith(":") ? TRANSCRIPT_BRAND.gradingSystemTitle.slice(0, -1) : TRANSCRIPT_BRAND.gradingSystemTitle}:`;

  return (
    <div className="transcript-print-root">
      {showPrintButton && (
        <div className="no-print mb-4 flex justify-end">
          <Button type="button" size="sm" onClick={() => window.print()}>
            Print Transcript
          </Button>
        </div>
      )}
      <div
        className={`transcript-document ${transcriptFont} mx-auto max-w-[210mm] bg-white px-4 py-3 text-[11px] text-black print:text-[10px]`}
        style={{ color: "#000" }}
      >
        {/* Official registrar banner (logo, name, motto, contact) */}
        <div className="transcript-header-banner mb-3 print:mb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={TRANSCRIPT_HEADER_IMAGE}
            alt={`${TRANSCRIPT_BRAND.universityName} — Office of the Registrar`}
            className="h-auto w-full max-h-[160px] object-contain object-left print:max-h-[120px]"
          />
          <div className="my-2 border-t border-black print:my-1" />
          <h2 className="text-center text-[13px] font-bold print:text-[12px]">
            {TRANSCRIPT_BRAND.documentTitle}
          </h2>
        </div>

        {/* Student info fills width up to grading table; gap-0 so tables sit flush */}
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-stretch sm:gap-0 print:mb-1 print:gap-0">
          <div className="min-w-0 w-full flex-1 sm:min-w-0">
            <table
              className="transcript-table transcript-info-table h-full w-full border border-black text-[11px] print:text-[10px]"
              style={{ borderCollapse: "collapse" }}
            >
              <tbody>
                {(
                  [
                    ["College", college],
                    ["Department", department],
                    ["Student Name", studentName],
                    ["Student ID", student.studentId],
                    ["Entry Year", String(entryYear)],
                  ] as const
                ).map(([label, value]) => (
                  <tr key={label}>
                    <td className={`${infoCell} w-[30%] font-bold`}>{label}</td>
                    <td
                      className={`${infoCell} font-bold ${label === "Student ID" ? "font-mono" : ""}`}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <table
            className="transcript-table transcript-grading-table w-full shrink-0 border border-black text-[11px] sm:w-44 print:text-[10px]"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th colSpan={2} className={`${tableHeaderCell} text-left`}>
                  {legendHeading}
                </th>
              </tr>
              <tr>
                <th className={`${tableHeaderCell} text-center font-semibold`}>
                  Percentage Score
                </th>
                <th className={`${tableHeaderCell} text-center font-semibold`}>
                  Grade
                </th>
              </tr>
            </thead>
            <tbody>
              {GRADING_SYSTEM_LEGEND.map(({ range, grade }) => (
                <tr key={`${range}-${grade}`}>
                  <td className={cellBorder}>{range}</td>
                  <td className={`${cellBorder} text-center font-semibold`}>{grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Academic years */}
        {yearKeys.map((key, keyIdx) => {
          const yearEndNum = Number(key);
          const records = recordsByYear[key] || [];
          const yearGpa = yearGpaMap[key];
          const prevKeys = yearKeys.slice(0, keyIdx);
          let cumCredits = 0;
          let cumHpts = 0;
          for (const pk of prevKeys) {
            const pr = recordsByYear[pk] || [];
            for (const r of pr) {
              cumCredits += r.course.creditHours;
              cumHpts += r.course.creditHours * (r.gradePoints ?? 0);
            }
          }
          const thisYearCredits = records.reduce((s, r) => s + r.course.creditHours, 0);
          const thisYearHpts = records.reduce(
            (s, r) => s + r.course.creditHours * (r.gradePoints ?? 0),
            0
          );
          const totalCreditsSoFar = cumCredits + thisYearCredits;
          const totalHptsSoFar = cumHpts + thisYearHpts;
          const cgpa =
            totalCreditsSoFar > 0
              ? Math.round((totalHptsSoFar / totalCreditsSoFar) * 100) / 100
              : 0;

          const academicYearLine = formatAcademicYearLine(yearEndNum);

          return (
            <div
              key={key}
              className="transcript-year-block mb-2 last:mb-1 print:mb-1"
            >
              <div className="transcript-year-table-wrap border border-black print:border-black">
                <div
                  className={yearHeadingLineClass}
                  style={{ backgroundColor: YEAR_HEAD_BG }}
                >
                  {academicYearLine}
                </div>
                <table
                  className="transcript-table transcript-year-grades-table mt-0 w-full table-fixed border-0 text-[11px] print:text-[10px]"
                  style={{ borderCollapse: "collapse", tableLayout: "fixed", width: "100%" }}
                >
                  <colgroup>
                    {YEAR_GRADES_COL_PCTS.map((w, i) => (
                      <col key={i} style={{ width: w }} />
                    ))}
                  </colgroup>
                <thead className="transcript-course-grade-thead">
                  <tr>
                    <th className={`${courseGradeTableHeaderCell} text-left`}>Course Code</th>
                    <th className={`${courseGradeTableHeaderCell} text-left`}>Course Title</th>
                    <th className={`${courseGradeTableHeaderCell} text-center`}>CrHrs</th>
                    <th className={`${courseGradeTableHeaderCell} text-center`}>Marks</th>
                    <th className={`${courseGradeTableHeaderCell} text-center`}>Grade</th>
                    <th className={`${courseGradeTableHeaderCell} text-center`}>GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    return (
                      <tr key={r.id} className="transcript-row bg-white">
                        <td
                          className={`${cellBorder} transcript-year-cell-code text-left font-mono font-semibold wrap-break-word`}
                        >
                          {r.course.code}
                        </td>
                        <td className={`${cellBorder} transcript-year-cell-title text-left wrap-break-word`}>
                          {r.course.name}
                        </td>
                        <td className={`${cellBorder} text-center`}>{r.course.creditHours}</td>
                        <td className={`${cellBorder} text-center`}>
                          {r.totalMarks.toFixed(2)}
                        </td>
                        <td className={`${cellBorder} text-center font-semibold`}>
                          {r.grade || "—"}
                        </td>
                        <td className={`${cellBorder} text-center`}>
                          {r.gradePoints != null ? r.gradePoints.toFixed(2) : "0.00"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className={`${cellBorder} font-semibold`}>
                      Total
                    </td>
                    <td className={`${cellBorder} text-center font-bold`}>{thisYearCredits}</td>
                    <td className={cellBorder} />
                    <td className={cellBorder} />
                    <td className={cellBorder} />
                  </tr>
                </tfoot>
              </table>
              </div>

              <div className="transcript-year-gpa mt-0.5 flex flex-wrap items-baseline justify-end gap-x-4 gap-y-0 text-[11px] font-semibold print:text-[10px]">
                <span>
                  GPA: <span className="font-bold">{yearGpa?.gpa.toFixed(2) ?? "0.00"}</span>
                </span>
                {keyIdx > 0 && (
                  <span>
                    CGPA: <span className="font-bold">{cgpa.toFixed(2)}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}

        <div className="mt-2 border-t border-black pt-1.5 print:mt-1 print:pt-0.5">
          <p className="text-[11px] font-bold print:text-[10px]">
            Cumulative GPA: <span className="text-[12px] font-bold print:text-[11px]">{cumulativeGPA.toFixed(2)}</span>
          </p>
          <p className="text-[11px] print:text-[10px]">Total Credits: {totalCredits}</p>
          <p className="mt-0.5 text-[10px] text-gray-700 print:text-[9px]">
            Generated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="mt-3 flex justify-end print:mt-1">
          <div className="w-40 text-right">
            <div className="mb-0.5 h-px border-t-2 border-black" />
            <p className="text-[11px] font-bold text-gray-900 print:text-[10px]">
              {TRANSCRIPT_BRAND.officeTitle}
            </p>
            <p className="text-[10px] text-gray-600 print:text-[9px]">Authorized Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}
