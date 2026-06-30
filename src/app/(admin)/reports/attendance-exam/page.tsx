"use client";

import React, { useCallback, useEffect, useState } from "react";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportFilterField, {
  ReportFilterSelect,
} from "@/components/reports/ReportFilterField";
import ReportContentArea from "@/components/reports/ReportContentArea";
import ReportSummaryBar, { ReportSummaryItem } from "@/components/reports/ReportSummaryBar";
import ReportLoadingState from "@/components/reports/ReportLoadingState";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/usePagination";
import { authFetch } from "@/lib/api";

type Department = { id: number; name: string; code: string };
type ClassItem = {
  id: number;
  name: string;
    year: number;
  department: { id: number; name: string; code: string };
};
type CourseItem = { id: number; code: string; name: string };
type RowData = {
  student: { id: number; studentId: string; firstName: string; lastName: string };
  attendance: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    totalSessions: number;
    attendancePercent: number;
    attendanceMarks: number;
  };
  examRecords: {
    courseId: number;
    courseCode: string;
    courseName: string;
    scores: Record<string, number>;
    totalMarks: number;
    grade: string;
    gradePoints: number;
  }[];
};

export default function AttendanceExamReportPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [classInfo, setClassInfo] = useState<{
    name: string;
        year: number;
    totalSessions: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterDept, setFilterDept] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterCourse, setFilterCourse] = useState("");

  const fetchReport = useCallback(async () => {
    if (!filterClass) {
      setRows([]);
      setClassInfo(null);
      setCourses([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ classId: filterClass });
      if (filterCourse) params.set("courseId", filterCourse);
      const res = await authFetch(`/api/reports/attendance-exam?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows || []);
        setCourses(data.courses || []);
        setClassInfo(
          data.class
            ? {
                name: data.class.name,
                year: data.year ?? new Date().getFullYear(),
                totalSessions: data.totalSessions ?? 0,
              }
            : null
        );
      } else {
        setRows([]);
        setClassInfo(null);
      }
    } catch {
      setRows([]);
      setClassInfo(null);
    }
    setLoading(false);
  }, [filterClass, filterCourse]);

  useEffect(() => {
    authFetch("/api/departments").then((r) => {
      if (r.ok) r.json().then((d: Department[]) => setDepartments(d));
    });
    authFetch("/api/classes").then((r) => {
      if (r.ok) r.json().then((d: ClassItem[]) => setClasses(d));
    });
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filteredClasses = filterDept
    ? classes.filter((c) => c.department?.id === Number(filterDept))
    : classes;

  const displayCourses = filterCourse
    ? courses.filter((c) => String(c.id) === filterCourse)
    : courses;

  const selectedDept = departments.find((d) => String(d.id) === filterDept);
  const selectedCourse = courses.find((c) => String(c.id) === filterCourse);

  const {
    paginatedItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total: rowsTotal,
    from,
    to,
  } = usePagination(rows, [filterClass, filterCourse]);

  const printMeta = [
    ...(selectedDept
      ? [{ label: "Department", value: `${selectedDept.code} — ${selectedDept.name}` }]
      : []),
    ...(classInfo
      ? [
          {
            label: "Class",
            value: `${classInfo.name} (${classInfo.year})`,
          },
        ]
      : []),
    ...(selectedCourse
      ? [{ label: "Course", value: `${selectedCourse.code} — ${selectedCourse.name}` }]
      : []),
    ...(classInfo ? [{ label: "Total Sessions", value: classInfo.totalSessions }] : []),
    ...(rows.length > 0 ? [{ label: "Students", value: rows.length }] : []),
  ];

  return (
    <ReportPageShell pageTitle="Attendance & Exam Report">
      <ReportCard>
        <ReportFilterSection
          hint={
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Attendance (Present + Excused) counts as 10% of the exam grade. Data is filtered
              by the class&apos;s year.
            </p>
          }
        >
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
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
          <ReportFilterField label="Class">
            <ReportFilterSelect
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setFilterCourse("");
              }}
              minWidth="200px"
            >
              <option value="">Select Class</option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.department?.code} - {c.name}
                </option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
          <ReportFilterField label="Course (optional)">
            <ReportFilterSelect
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              minWidth="200px"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
        </ReportFilterSection>

        {!filterClass ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            Select a class to view attendance and exam results.
          </div>
        ) : loading ? (
          <ReportLoadingState />
        ) : (
          <ReportContentArea
            title="Attendance & Exam Report"
            printMeta={printMeta}
            summary={
              classInfo ? (
                <ReportSummaryBar>
                  <ReportSummaryItem
                    value={
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {classInfo.name} · {classInfo.year}
                      </span>
                    }
                  />
                  <ReportSummaryItem label="sessions" value={classInfo.totalSessions} />
                  <ReportSummaryItem
                    value={
                      <span className="text-green-700 dark:text-green-300">
                        Attendance = 10% of Exam — (Present + Excused) / Total × 10
                      </span>
                    }
                  />
                </ReportSummaryBar>
              ) : undefined
            }
          >
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                No students in this class or no data for the selected filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                    <TableRow>
                      <TableCell
                        isHeader
                        className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                      >
                        Student
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                      >
                        Present
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                      >
                        Absent
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                      >
                        Excused
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                      >
                        Attend %
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                      >
                        Marks (0-10)
                      </TableCell>
                      {displayCourses.map((c) => (
                        <TableCell
                          key={c.id}
                          isHeader
                          className="px-5 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                        >
                          {c.code} Total
                        </TableCell>
                      ))}
                      {displayCourses.map((c) => (
                        <TableCell
                          key={`g-${c.id}`}
                          isHeader
                          className="px-5 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                        >
                          {c.code} Grade
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((r) => {
                      const examMap = new Map(r.examRecords.map((e) => [e.courseId, e]));
                      return (
                        <TableRow
                          key={r.student.id}
                          className="border-b border-gray-50 dark:border-gray-800"
                        >
                          <TableCell className="px-5 py-3">
                            <p className="font-medium text-gray-800 dark:text-white/90">
                              {r.student.firstName} {r.student.lastName}
                            </p>
                            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                              {r.student.studentId}
                            </p>
                          </TableCell>
                          <TableCell className="px-5 py-3 text-center font-medium text-green-600 dark:text-green-400">
                            {r.attendance.present}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-center font-medium text-red-600 dark:text-red-400">
                            {r.attendance.absent}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                            {r.attendance.excused}
                          </TableCell>
                          <TableCell className="px-5 py-3 text-center">
                            <span
                              className={
                                r.attendance.attendancePercent >= 80
                                  ? "font-medium text-green-600 dark:text-green-400"
                                  : r.attendance.attendancePercent >= 60
                                    ? "text-yellow-600 dark:text-yellow-500"
                                    : "font-medium text-red-600 dark:text-red-400"
                              }
                            >
                              {r.attendance.attendancePercent}%
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-3 text-center font-medium text-gray-800 dark:text-white/90">
                            {r.attendance.attendanceMarks.toFixed(2)}
                          </TableCell>
                          {displayCourses.map((c) => {
                            const exam = examMap.get(c.id);
                            return (
                              <TableCell
                                key={c.id}
                                className="px-5 py-3 text-center text-sm text-gray-700 dark:text-gray-300"
                              >
                                {exam ? exam.totalMarks.toFixed(1) : "—"}
                              </TableCell>
                            );
                          })}
                          {displayCourses.map((c) => {
                            const exam = examMap.get(c.id);
                            return (
                              <TableCell key={`g-${c.id}`} className="px-5 py-3 text-center">
                                {exam ? (
                                  <span
                                    className={
                                      exam.grade === "A" || exam.grade === "A-"
                                        ? "font-medium text-green-600 dark:text-green-400"
                                        : exam.grade === "F"
                                          ? "font-medium text-red-600 dark:text-red-400"
                                          : "text-gray-700 dark:text-gray-300"
                                    }
                                  >
                                    {exam.grade || "—"}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <TablePagination
                  className="no-print"
                  page={page}
                  totalPages={totalPages}
                  total={rowsTotal}
                  from={from}
                  to={to}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </ReportContentArea>
        )}
      </ReportCard>
    </ReportPageShell>
  );
}
