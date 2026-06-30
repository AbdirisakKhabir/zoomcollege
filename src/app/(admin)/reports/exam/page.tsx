"use client";

import React, { useCallback, useEffect, useState } from "react";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportFilterField, {
  ReportFilterInput,
  ReportFilterSelect,
} from "@/components/reports/ReportFilterField";
import ReportContentArea from "@/components/reports/ReportContentArea";
import ReportSummaryBar, { ReportSummaryItem } from "@/components/reports/ReportSummaryBar";
import ReportLoadingState from "@/components/reports/ReportLoadingState";
import {
  TablePagination,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/usePagination";
import Badge from "@/components/ui/badge/Badge";
import { authFetch } from "@/lib/api";

type Department = { id: number; name: string; code: string };
type ClassItem = {
  id: number;
  name: string;
    year: number;
  department: { id: number; name: string; code: string };
};
type ExamRecord = {
  id: number;
    year: number;
  scores: Record<string, number> | null;
  totalMarks: number;
  grade: string | null;
  gradePoints: number | null;
  student: { studentId: string; firstName: string; lastName: string; department: { code: string } };
  course: {
    code: string;
    name: string;
    creditHours: number;
    assessments?: { key: string; name: string; weightPercent: number; sortOrder: number }[];
  };
  attendancePercent?: number;
  attendanceMarks?: number;
  totalSessions?: number;
};

function formatScoresShort(
  scores: Record<string, number> | null | undefined,
  assessments: { key: string; name: string; sortOrder: number }[] | undefined
): string {
  if (!scores || !assessments?.length) return "—";
  return [...assessments]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((a) => `${a.name.slice(0, 8)}:${scores[a.key] ?? 0}`)
    .join(" · ");
}

const GRADE_COLOR: Record<string, "success" | "primary" | "warning" | "error" | "info"> = {
  A: "success", "A-": "success", "B+": "primary", B: "primary", "B-": "info",
  "C+": "warning", C: "warning", D: "error", F: "error",
};

export default function ExamReportPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
    const [records, setRecords] = useState<ExamRecord[]>([]);
  const [summary, setSummary] = useState<{ total: number; byGrade: Record<string, number>; avgGradePoints: number }>({
    total: 0, byGrade: {}, avgGradePoints: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState("");
  const [filterClass, setFilterClass] = useState("");
    const [filterYear, setFilterYear] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDept) params.set("departmentId", filterDept);
      if (filterClass) params.set("classId", filterClass);
      if (filterYear) params.set("year", filterYear);
      const res = await authFetch(`/api/reports/exam?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setSummary(data.summary || { total: 0, byGrade: {}, avgGradePoints: 0 });
      }
    } catch { /* empty */ }
    setLoading(false);
  }, [filterDept, filterClass, filterYear]);

  useEffect(() => {
    authFetch("/api/departments").then((r) => { if (r.ok) r.json().then((d: Department[]) => setDepartments(d)); });
    authFetch("/api/classes").then((r) => { if (r.ok) r.json().then((d: ClassItem[]) => setClasses(d)); });
      }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filteredClasses = filterDept ? classes.filter((c) => c.department?.id === Number(filterDept)) : classes;
  const currentYear = new Date().getFullYear();
  const selectedDept = departments.find((d) => String(d.id) === filterDept);
  const selectedClass = classes.find((c) => String(c.id) === filterClass);

  const {
    paginatedItems: paginatedRecords,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total: recordsTotal,
    from,
    to,
  } = usePagination(records, [filterDept, filterClass, filterYear]);

  const printMeta = [
    ...(selectedDept
      ? [{ label: "Department", value: `${selectedDept.code} — ${selectedDept.name}` }]
      : []),
    ...(selectedClass
      ? [
          {
            label: "Class",
            value: `${selectedClass.department?.code} - ${selectedClass.name} (${selectedClass.year})`,
          },
        ]
      : []),
    ...(filterYear ? [{ label: "Year", value: filterYear }] : []),
    { label: "Total Records", value: summary.total },
    { label: "Avg Grade Points", value: summary.avgGradePoints.toFixed(2) },
    ...Object.entries(summary.byGrade || {}).map(([grade, count]) => ({
      label: `Grade ${grade}`,
      value: count,
    })),
  ];

  return (
    <ReportPageShell pageTitle="Exam Report">
      <ReportCard>
        <ReportFilterSection>
          <ReportFilterField label="Department">
            <ReportFilterSelect
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setFilterClass("");
              }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
          <ReportFilterField label="Class">
            <ReportFilterSelect
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              minWidth="200px"
            >
              <option value="">All Classes</option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.department?.code} - {c.name} ({c.year})
                </option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
          <ReportFilterField label="Year">
            <ReportFilterInput
              type="number"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              placeholder={`e.g. ${currentYear}`}
              className="sm:min-w-[100px]"
            />
          </ReportFilterField>
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : (
          <ReportContentArea
            title="Exam Report"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <ReportSummaryItem label="records" value={summary.total} />
                <span className="text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-800 dark:text-white/80">
                    {summary.avgGradePoints.toFixed(2)}
                  </strong>{" "}
                  avg grade points
                </span>
                {Object.entries(summary.byGrade || {}).map(([grade, count]) => (
                  <span key={grade} className="text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-800 dark:text-white/80">{count}</strong>{" "}
                    grade {grade}
                  </span>
                ))}
              </ReportSummaryBar>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm print:text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50 print:border-black print:bg-transparent">
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">Student</th>
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">Course</th>
                    <th className="py-2.5 px-3 text-center font-semibold text-gray-700 print:text-black">Year</th>
                    <th className="min-w-[180px] py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">Components</th>
                    <th className="py-2.5 px-3 text-center font-semibold text-gray-700 print:text-black">Total</th>
                    <th className="py-2.5 px-3 text-center font-semibold text-gray-700 print:text-black">Grade</th>
                    <th className="py-2.5 px-3 text-center font-semibold text-gray-700 print:text-black">GP</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-gray-500">
                        No exam records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r, idx) => (
                      <tr
                        key={r.id}
                        className={`border-b border-gray-100 print:border-gray-300 ${
                          idx % 2 === 1 ? "bg-gray-50/60 print:bg-transparent" : ""
                        }`}
                      >
                        <td className="py-2 px-3 print:text-black">
                          <p className="font-medium text-gray-800 print:text-black">
                            {r.student.firstName} {r.student.lastName}
                          </p>
                          <p className="font-mono text-xs text-gray-500 print:text-black">
                            {r.student.studentId}
                          </p>
                        </td>
                        <td className="py-2 px-3 print:text-black">
                          <p className="font-medium text-gray-800 print:text-black">{r.course.code}</p>
                          <p className="text-xs text-gray-500 print:text-black">{r.course.name}</p>
                        </td>
                        <td className="py-2 px-3 text-center text-sm text-gray-700 print:text-black">{r.year}</td>
                        <td className="max-w-[220px] py-2 px-3 text-left text-xs text-gray-600 print:text-black">
                          {formatScoresShort(r.scores, r.course.assessments)}
                        </td>
                        <td className="py-2 px-3 text-center font-medium text-gray-800 print:text-black">{r.totalMarks}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="no-print">
                            <Badge variant="solid" color={GRADE_COLOR[r.grade || "F"] || "error"} size="sm">
                              {r.grade || "N/A"}
                            </Badge>
                          </span>
                          <span className="hidden print:inline">{r.grade || "N/A"}</span>
                        </td>
                        <td className="py-2 px-3 text-center font-medium text-gray-700 print:text-black">
                          {r.gradePoints?.toFixed(1) ?? "0.0"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <TablePagination
                className="no-print"
                page={page}
                totalPages={totalPages}
                total={recordsTotal}
                from={from}
                to={to}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </ReportContentArea>
        )}
      </ReportCard>
    </ReportPageShell>
  );
}
