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
import Badge from "@/components/ui/badge/Badge";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/api";
import { exportReportCsv } from "@/lib/report-utils";

type Department = { id: number; name: string; code: string };
type ClassItem = {
  id: number;
  name: string;
    year: number;
  department: { id: number; name: string; code: string };
};
type ShiftStudent = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  gender: string | null;
  email: string | null;
  status: string;
  paymentStatus: string;
  department: { id: number; name: string; code: string };
  class: { id: number; name: string; year: number } | null;
  shifts: string[];
  shiftsLabel: string;
  scheduleSummary: string[];
};

const SHIFTS = ["Morning", "Afternoon", "Evening"];

export default function StudentsByShiftReportPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<ShiftStudent[]>([]);
  const [summary, setSummary] = useState<{ count: number; byShift: Record<string, number> }>({
    count: 0,
    byShift: {},
  });
  const [loading, setLoading] = useState(false);
  const [filterDept, setFilterDept] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterStatus, setFilterStatus] = useState("Admitted");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDept) params.set("departmentId", filterDept);
      if (filterClass) params.set("classId", filterClass);
      if (filterShift) params.set("shift", filterShift);
      if (filterStatus) params.set("status", filterStatus);
      const res = await authFetch(`/api/reports/students-by-shift?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setSummary(data.summary || { count: 0, byShift: {} });
      }
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [filterDept, filterClass, filterShift, filterStatus]);

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
  const selectedDept = departments.find((d) => String(d.id) === filterDept);

  const {
    paginatedItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total,
    from,
    to,
  } = usePagination(students, [filterDept, filterClass, filterShift, filterStatus]);

  const handleExportCSV = () => {
    if (!students.length) return;
    exportReportCsv(
      `Students_By_Shift_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Student ID", "Name", "Phone", "Department", "Class", "Shifts", "Status"],
      students.map((s) => [
        s.studentId,
        `${s.firstName} ${s.lastName}`,
        s.phone ?? "",
        `${s.department.code} - ${s.department.name}`,
        s.class ? `${s.class.name}` : "—",
        s.shiftsLabel,
        s.status,
      ])
    );
  };

  const printMeta = [
    ...(selectedDept
      ? [{ label: "Department", value: `${selectedDept.code} — ${selectedDept.name}` }]
      : [{ label: "Department", value: user?.isSuperAdmin ? "All Departments" : "Assigned" }]),
    ...(filterShift ? [{ label: "Shift", value: filterShift }] : []),
    { label: "Status", value: filterStatus === "all" ? "All" : filterStatus },
    { label: "Total Students", value: summary.count },
    ...Object.entries(summary.byShift).map(([shift, count]) => ({
      label: `${shift} Shift`,
      value: count,
    })),
  ];

  return (
    <ReportPageShell
      pageTitle="Students Report"
      onExportCsv={handleExportCSV}
      exportDisabled={!students.length}
    >
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
              {user?.isSuperAdmin && <option value="">All Departments</option>}
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
              onChange={(e) => setFilterClass(e.target.value)}
              minWidth="200px"
            >
              <option value="">All Classes</option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.department?.code} - {c.name}
                </option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
          <ReportFilterField label="Shift">
            <ReportFilterSelect
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              minWidth="140px"
            >
              <option value="">All Shifts</option>
              {SHIFTS.map((sh) => (
                <option key={sh} value={sh}>
                  {sh}
                </option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
          <ReportFilterField label="Status">
            <ReportFilterSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              minWidth="140px"
            >
              <option value="Admitted">Admitted</option>
              <option value="Inactive">Inactive</option>
              <option value="Graduated">Graduated</option>
              <option value="all">All Statuses</option>
            </ReportFilterSelect>
          </ReportFilterField>
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : (
          <ReportContentArea
            title="Students Report (by Shift)"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <ReportSummaryItem label="students" value={summary.count} />
                {SHIFTS.map((sh) =>
                  summary.byShift[sh] ? (
                    <span key={sh} className="text-gray-600 dark:text-gray-400">
                      <strong className="text-gray-800 dark:text-white/80">
                        {summary.byShift[sh]}
                      </strong>{" "}
                      {sh}
                    </span>
                  ) : null
                )}
              </ReportSummaryBar>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-transparent! hover:bg-transparent!">
                    <TableCell isHeader>Student ID</TableCell>
                    <TableCell isHeader>Name</TableCell>
                    <TableCell isHeader>Phone</TableCell>
                    <TableCell isHeader>Department</TableCell>
                    <TableCell isHeader>Class</TableCell>
                    <TableCell isHeader>Shift(s)</TableCell>
                    <TableCell isHeader>Schedule</TableCell>
                    <TableCell isHeader>Status</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                        No students match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.studentId}</TableCell>
                        <TableCell className="font-medium">
                          {s.firstName} {s.lastName}
                        </TableCell>
                        <TableCell>{s.phone ?? "—"}</TableCell>
                        <TableCell>{s.department.code}</TableCell>
                        <TableCell>
                          {s.class
                            ? `${s.class.name}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {s.shifts.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {s.shifts.map((sh) => (
                                <Badge
                                  key={sh}
                                  color={
                                    sh === "Morning"
                                      ? "success"
                                      : sh === "Afternoon"
                                        ? "warning"
                                        : "info"
                                  }
                                  size="sm"
                                >
                                  {sh}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="max-w-[220px] text-xs text-gray-600 dark:text-gray-400">
                          {s.scheduleSummary.length > 0 ? (
                            <span title={s.scheduleSummary.join("\n")}>
                              {s.scheduleSummary.slice(0, 2).join(" · ")}
                              {s.scheduleSummary.length > 2
                                ? ` +${s.scheduleSummary.length - 2} more`
                                : ""}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            color={
                              s.status === "Admitted"
                                ? "success"
                                : s.status === "Inactive"
                                  ? "error"
                                  : "info"
                            }
                            size="sm"
                          >
                            {s.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                className="no-print"
                page={page}
                totalPages={totalPages}
                total={total}
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
