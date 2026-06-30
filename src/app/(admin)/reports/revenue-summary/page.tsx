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
import { authFetch } from "@/lib/api";
import ReportDateRangeFilter from "@/components/reports/ReportDateRangeFilter";
import { useReportDateRange } from "@/hooks/useReportDateRange";
import { formatReportDateRange } from "@/lib/report-date-range";
import { exportReportCsv } from "@/lib/report-utils";

type Department = { id: number; name: string; code: string };
type ClassRow = {
  id: number;
  name: string;
  department: { id: number; name: string; code: string };
  studentCount: number;
  targetRevenue: number;
  amountCollected: number;
  variance: number;
};


export default function RevenueSummaryReportPage() {
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useReportDateRange("year");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [summary, setSummary] = useState({
    classCount: 0,
    totalStudents: 0,
    totalTargetRevenue: 0,
    totalAmountCollected: 0,
    totalVariance: 0,
  });
  const [periodLabel, setPeriodLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterDept, setFilterDept] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      if (filterDept) params.set("departmentId", filterDept);
      const res = await authFetch(`/api/reports/revenue-summary?${params}`);
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
        setSummary(
          data.summary || {
            classCount: 0,
            totalStudents: 0,
            totalTargetRevenue: 0,
            totalAmountCollected: 0,
            totalVariance: 0,
          }
        );
        setPeriodLabel(formatReportDateRange(data.dateFrom, data.dateTo));
      }
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [dateFrom, dateTo, filterDept]);

  useEffect(() => {
    authFetch("/api/departments").then((r) => {
      if (r.ok) r.json().then((d: Department[]) => setDepartments(d));
    });
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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
  } = usePagination(classes, [dateFrom, dateTo, filterDept]);

  const handleExportCSV = () => {
    if (!classes.length) return;
    exportReportCsv(
      `Revenue_Summary_${dateFrom}_${dateTo}.csv`,
      [
        "Class",
        "Department",
        "Students",
        "Target Revenue",
        "Amount Collected",
        "Variance",
      ],
      classes.map((c) => [
        c.name,
        `${c.department.code} - ${c.department.name}`,
        c.studentCount,
        c.targetRevenue,
        c.amountCollected,
        c.variance,
      ]),
      [
        "TOTAL",
        "",
        summary.totalStudents,
        summary.totalTargetRevenue,
        summary.totalAmountCollected,
        summary.totalVariance,
      ]
    );
  };

  const printMeta = [
    { label: "Period", value: periodLabel || formatReportDateRange(dateFrom, dateTo) },
    ...(selectedDept
      ? [{ label: "Department", value: `${selectedDept.code} — ${selectedDept.name}` }]
      : []),
    { label: "Classes", value: summary.classCount },
    { label: "Target Revenue", value: `$${summary.totalTargetRevenue.toLocaleString()}` },
    { label: "Collected", value: `$${summary.totalAmountCollected.toLocaleString()}` },
    {
      label: "Variance",
      value: `$${summary.totalVariance.toLocaleString()}`,
    },
  ];

  return (
    <ReportPageShell
      pageTitle="Revenue Summary Report"
      onExportCsv={handleExportCSV}
      exportDisabled={!classes.length}
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
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : (
          <ReportContentArea
            title="Revenue Summary Report"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <span className="font-medium text-gray-800 dark:text-white/90">
                  {periodLabel}
                </span>
                <ReportSummaryItem label="classes" value={summary.classCount} />
                <ReportSummaryItem label="students" value={summary.totalStudents} />
                <span className="text-gray-600 dark:text-gray-400">
                  Target:{" "}
                  <strong className="text-gray-800 dark:text-white/80">
                    ${summary.totalTargetRevenue.toLocaleString()}
                  </strong>
                </span>
                <span className="text-green-700 dark:text-green-400">
                  Collected:{" "}
                  <strong>${summary.totalAmountCollected.toLocaleString()}</strong>
                </span>
                <span
                  className={
                    summary.totalVariance >= 0
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  Variance:{" "}
                  <strong>${summary.totalVariance.toLocaleString()}</strong>
                </span>
              </ReportSummaryBar>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-transparent! hover:bg-transparent!">
                    <TableCell isHeader>Class</TableCell>
                    <TableCell isHeader>Department</TableCell>
                    <TableCell isHeader className="text-center">Students</TableCell>
                    <TableCell isHeader className="text-right">Target Revenue</TableCell>
                    <TableCell isHeader className="text-right">Collected</TableCell>
                    <TableCell isHeader className="text-right">Variance</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-gray-500">
                        No class data for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {paginatedItems.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.department.code}</TableCell>
                          <TableCell className="text-center">{c.studentCount}</TableCell>
                          <TableCell className="text-right">
                            ${c.targetRevenue.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                            ${c.amountCollected.toLocaleString()}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              c.variance >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            ${c.variance.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50 font-semibold dark:bg-gray-800/50">
                        <TableCell colSpan={3} className="text-right font-bold">
                          Total
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {summary.totalStudents}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${summary.totalTargetRevenue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                          ${summary.totalAmountCollected.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold ${
                            summary.totalVariance >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          ${summary.totalVariance.toLocaleString()}
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
