"use client";

import React, { useCallback, useEffect, useState } from "react";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportFilterField, {
  ReportFilterInput,
  ReportFilterSelect,
} from "@/components/reports/ReportFilterField";
import ReportDateRangeFilter from "@/components/reports/ReportDateRangeFilter";
import ReportContentArea from "@/components/reports/ReportContentArea";
import ReportSummaryBar, { ReportSummaryItem } from "@/components/reports/ReportSummaryBar";
import ReportLoadingState from "@/components/reports/ReportLoadingState";
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/usePagination";
import { useReportDateRange } from "@/hooks/useReportDateRange";
import { authFetch } from "@/lib/api";
import { formatReportDateRange } from "@/lib/report-date-range";
import { exportReportCsv } from "@/lib/report-utils";

type Department = { id: number; name: string; code: string };
type ClassItem = {
  id: number;
  name: string;
    year: number;
  department: { id: number; name: string; code: string };
};
type AbsentStudent = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  department: { id: number; name: string; code: string };
  class: { id: number; name: string; year: number } | null;
  absentDays: number;
};

export default function AbsentAttendanceReportPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<AbsentStudent[]>([]);
  const [summary, setSummary] = useState({ count: 0, totalAbsentDays: 0, minAbsentDays: 1 });
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [filterDept, setFilterDept] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useReportDateRange("month");
  const [minAbsentDays, setMinAbsentDays] = useState("3");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams();
      if (filterDept) params.set("departmentId", filterDept);
      if (filterClass) params.set("classId", filterClass);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (minAbsentDays) params.set("minAbsentDays", minAbsentDays);
      const res = await authFetch(`/api/reports/absent-attendance?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setSummary(data.summary || { count: 0, totalAbsentDays: 0, minAbsentDays: 1 });
      }
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [filterDept, filterClass, dateFrom, dateTo, minAbsentDays]);

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
  } = usePagination(students, [filterDept, filterClass, dateFrom, dateTo, minAbsentDays]);

  const allOnPageSelected =
    paginatedItems.length > 0 && paginatedItems.every((s) => selected.has(s.id));
  const someSelected = selected.size > 0;

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedItems.forEach((s) => next.delete(s.id));
      } else {
        paginatedItems.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkInactive = async () => {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Mark ${selected.size} selected student(s) as Inactive? They will no longer appear as Admitted.`
      )
    ) {
      return;
    }
    setMarking(true);
    try {
      const res = await authFetch("/api/reports/absent-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update students");
        return;
      }
      alert(data.message || "Students marked inactive");
      await fetchReport();
    } catch {
      alert("Network error");
    } finally {
      setMarking(false);
    }
  };

  const handleExportCSV = () => {
    if (!students.length) return;
    exportReportCsv(
      `Absent_Students_${dateFrom}_to_${dateTo}.csv`,
      ["Student ID", "Name", "Phone", "Department", "Class", "Absent Days"],
      students.map((s) => [
        s.studentId,
        `${s.firstName} ${s.lastName}`,
        s.phone ?? "",
        `${s.department.code} - ${s.department.name}`,
        s.class ? `${s.class.name}` : "—",
        s.absentDays,
      ])
    );
  };

  const dateRangeLabel = formatReportDateRange(dateFrom, dateTo);

  const printMeta = [
    { label: "Period", value: dateRangeLabel },
    ...(selectedDept
      ? [{ label: "Department", value: `${selectedDept.code} — ${selectedDept.name}` }]
      : []),
    { label: "Min Absent Days", value: minAbsentDays },
    { label: "Students", value: summary.count },
    { label: "Total Absent Days", value: summary.totalAbsentDays },
  ];

  return (
    <ReportPageShell
      pageTitle="Absent Attendance Report"
      onExportCsv={handleExportCSV}
      exportDisabled={!students.length}
      actions={
        someSelected ? (
          <Button size="sm" onClick={handleMarkInactive} disabled={marking}>
            {marking ? "Updating…" : `Mark ${selected.size} Inactive`}
          </Button>
        ) : undefined
      }
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
          <ReportDateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <ReportFilterField label="Min absent days">
            <ReportFilterInput
              type="number"
              min={1}
              value={minAbsentDays}
              onChange={(e) => setMinAbsentDays(e.target.value)}
              className="!min-w-[100px]"
            />
          </ReportFilterField>
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : (
          <ReportContentArea
            title="Absent Attendance Report"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <span className="text-gray-500 dark:text-gray-400">{dateRangeLabel}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  Min <strong>{minAbsentDays}</strong> absent days
                </span>
                <ReportSummaryItem label="students" value={summary.count} />
                <ReportSummaryItem label="total absent days" value={summary.totalAbsentDays} />
                {someSelected && (
                  <span className="font-medium text-brand-600 dark:text-brand-400">
                    {selected.size} selected
                  </span>
                )}
              </ReportSummaryBar>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-transparent! hover:bg-transparent!">
                    <TableCell isHeader className="no-print w-10">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleAllOnPage}
                        aria-label="Select all on page"
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell isHeader>Student ID</TableCell>
                    <TableCell isHeader>Name</TableCell>
                    <TableCell isHeader>Phone</TableCell>
                    <TableCell isHeader>Department</TableCell>
                    <TableCell isHeader>Class</TableCell>
                    <TableCell isHeader className="text-center">Absent Days</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-gray-500">
                        No students meet the absent-day threshold for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="no-print">
                          <input
                            type="checkbox"
                            checked={selected.has(s.id)}
                            onChange={() => toggleOne(s.id)}
                            aria-label={`Select ${s.studentId}`}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
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
                        <TableCell className="text-center">
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {s.absentDays}
                          </span>
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
