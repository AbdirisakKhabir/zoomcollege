"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportFilterField, {
  ReportFilterSelect,
} from "@/components/reports/ReportFilterField";
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
import Badge from "@/components/ui/badge/Badge";
import { authFetch } from "@/lib/api";
import ReportDateRangeFilter from "@/components/reports/ReportDateRangeFilter";
import { useReportDateRange } from "@/hooks/useReportDateRange";
import { formatReportDateRange } from "@/lib/report-date-range";
import { exportReportCsv } from "@/lib/report-utils";

type Department = { id: number; name: string; code: string };
type ClassItem = {
  id: number;
  name: string;
    year: number;
  department: { id: number; name: string; code: string };
};
type PaidStudent = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  gender: string | null;
  paymentStatus: string;
  department: { id: number; name: string; code: string };
  class: { id: number; name: string; year: number } | null;
  expectedFee: number;
  amountPaid: number;
};

export default function PaidStudentsReportPage() {
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useReportDateRange("month");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<PaidStudent[]>([]);
  const [summary, setSummary] = useState({ count: 0, totalPaid: 0, totalExpected: 0 });
  const [periodLabel, setPeriodLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterDept, setFilterDept] = useState("");
  const [filterClass, setFilterClass] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      if (filterDept) params.set("departmentId", filterDept);
      if (filterClass) params.set("classId", filterClass);
      const res = await authFetch(`/api/reports/paid-students?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setSummary(data.summary || { count: 0, totalPaid: 0, totalExpected: 0 });
        setPeriodLabel(data.periodLabel || formatReportDateRange(dateFrom, dateTo));
      }
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [dateFrom, dateTo, filterDept, filterClass]);

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
  } = usePagination(students, [dateFrom, dateTo, filterDept, filterClass]);

  const handleExportCSV = () => {
    if (!students.length) return;
    exportReportCsv(
      `Paid_Students_${dateFrom}_${dateTo}.csv`,
      [
        "Student ID",
        "Name",
        "Phone",
        "Department",
        "Class",
        "Payment Status",
        "Expected Fee",
        "Amount Paid",
      ],
      students.map((s) => [
        s.studentId,
        `${s.firstName} ${s.lastName}`,
        s.phone ?? "",
        `${s.department.code} - ${s.department.name}`,
        s.class ? `${s.class.name}` : "—",
        s.paymentStatus,
        s.expectedFee,
        s.amountPaid,
      ])
    );
  };

  const printMeta = [
    { label: "Period", value: periodLabel || formatReportDateRange(dateFrom, dateTo) },
    ...(selectedDept
      ? [{ label: "Department", value: `${selectedDept.code} — ${selectedDept.name}` }]
      : []),
    { label: "Paid Students", value: summary.count },
    { label: "Total Paid", value: `$${summary.totalPaid.toLocaleString()}` },
    { label: "Total Expected", value: `$${summary.totalExpected.toLocaleString()}` },
  ];

  return (
    <ReportPageShell
      pageTitle="Paid Students Report"
      onExportCsv={handleExportCSV}
      exportDisabled={!students.length}
      actions={
        <Link href="/reports/payment">
          <Button variant="outline" size="sm">
            ← All Reports
          </Button>
        </Link>
      }
    >
      <ReportCard>
        <ReportFilterSection>
          <ReportDateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
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
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : (
          <ReportContentArea
            title="Paid Students Report"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <span className="font-medium text-gray-800 dark:text-white/90">
                  {periodLabel || formatReportDateRange(dateFrom, dateTo)}
                </span>
                <ReportSummaryItem label="paid students" value={summary.count} />
                <span className="font-medium text-green-700 dark:text-green-400">
                  <strong className="text-gray-800 dark:text-white/80">
                    ${summary.totalPaid.toLocaleString()}
                  </strong>{" "}
                  collected
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-800 dark:text-white/80">
                    ${summary.totalExpected.toLocaleString()}
                  </strong>{" "}
                  expected
                </span>
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
                    <TableCell isHeader>Status</TableCell>
                    <TableCell isHeader className="text-right">Expected</TableCell>
                    <TableCell isHeader className="text-right">Paid</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                        No students paid in the selected period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {paginatedItems.map((s) => (
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
                            <Badge
                              color={
                                s.paymentStatus === "Full Scholarship"
                                  ? "success"
                                  : s.paymentStatus === "Half Scholar"
                                    ? "warning"
                                    : "info"
                              }
                              size="sm"
                            >
                              {s.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            ${s.expectedFee.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                            ${s.amountPaid.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50 font-semibold dark:bg-gray-800/50">
                        <TableCell colSpan={6} className="text-right">
                          Total
                        </TableCell>
                        <TableCell className="text-right">
                          ${summary.totalExpected.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                          ${summary.totalPaid.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </>
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
