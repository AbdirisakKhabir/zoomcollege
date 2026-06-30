"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportFilterField, {
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
import Badge from "@/components/ui/badge/Badge";
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
type BalanceStudent = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  gender: string | null;
  paymentStatus: string;
  balance: number;
  department: { id: number; name: string; code: string };
  class: { id: number; name: string; year: number } | null;
};

export default function OutstandingBalancesReportPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<BalanceStudent[]>([]);
  const [summary, setSummary] = useState({ count: 0, totalBalance: 0 });
  const [loading, setLoading] = useState(false);
  const [filterDept, setFilterDept] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useReportDateRange("empty-to-today");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDept) params.set("departmentId", filterDept);
      if (filterClass) params.set("classId", filterClass);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await authFetch(`/api/reports/outstanding-balances?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setSummary(data.summary || { count: 0, totalBalance: 0 });
      }
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [filterDept, filterClass, dateFrom, dateTo]);

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
  } = usePagination(students, [filterDept, filterClass, dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (!students.length) return;
    exportReportCsv(
      `Outstanding_Balances_${dateTo || "all"}.csv`,
      ["Student ID", "Name", "Phone", "Department", "Class", "Payment Status", "Balance"],
      students.map((s) => [
        s.studentId,
        `${s.firstName} ${s.lastName}`,
        s.phone ?? "",
        `${s.department.code} - ${s.department.name}`,
        s.class ? `${s.class.name}` : "—",
        s.paymentStatus,
        s.balance,
      ]),
      ["TOTAL", "", "", "", "", "", summary.totalBalance]
    );
  };

  const dateRangeLabel = formatReportDateRange(dateFrom, dateTo);

  const printMeta = [
    { label: "Period", value: dateRangeLabel },
    ...(selectedDept
      ? [{ label: "Department", value: `${selectedDept.code} — ${selectedDept.name}` }]
      : []),
    { label: "Students", value: summary.count },
    { label: "Total Outstanding", value: `$${summary.totalBalance.toLocaleString()}` },
  ];

  return (
    <ReportPageShell
      pageTitle="Outstanding Balances Report"
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
            allowEmptyStart
          />
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : (
          <ReportContentArea
            title="Outstanding Balances Report"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <span className="text-gray-500 dark:text-gray-400">{dateRangeLabel}</span>
                <ReportSummaryItem label="students with balance" value={summary.count} />
                <span className="font-medium text-red-700 dark:text-red-400">
                  <strong className="text-gray-800 dark:text-white/80">
                    ${summary.totalBalance.toLocaleString()}
                  </strong>{" "}
                  total outstanding
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
                    <TableCell isHeader className="text-right">Balance</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-gray-500">
                        No students with outstanding balance match the filters.
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
                            <Badge variant="light" color="warning" size="sm">
                              {s.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600 dark:text-red-400">
                            ${s.balance.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50 font-semibold dark:bg-gray-800/50">
                        <TableCell colSpan={6} className="text-right">
                          Total
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
                          ${summary.totalBalance.toLocaleString()}
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
