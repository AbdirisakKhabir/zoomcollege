"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportDateRangeFilter from "@/components/reports/ReportDateRangeFilter";
import { useReportDateRange } from "@/hooks/useReportDateRange";
import { formatReportDateRange } from "@/lib/report-date-range";
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

function formatDateLabel(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type ClassSummaryRow = {
  classId: number;
  name: string;
  department: { id: number; name: string; code: string };
  total: number;
  count: number;
};

export default function DailyRevenueReportPage() {
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useReportDateRange("month");
  const [data, setData] = useState<{
    dateFrom: string;
    dateTo: string;
    totalRevenue: number;
    totalCount: number;
    dailySummary: { date: string; total: number; count: number }[];
    classSummary: ClassSummaryRow[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      const res = await authFetch(`/api/finance/daily-revenue?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dailySummaryRows = data?.dailySummary ?? [];
  const classSummaryRows = data?.classSummary ?? [];
  const {
    paginatedItems: paginatedDailySummary,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total: dailySummaryTotal,
    from,
    to,
  } = usePagination(dailySummaryRows, [dateFrom, dateTo]);
  const {
    paginatedItems: paginatedClassSummary,
    page: classPage,
    setPage: setClassPage,
    pageSize: classPageSize,
    setPageSize: setClassPageSize,
    totalPages: classTotalPages,
    total: classSummaryTotal,
    from: classFrom,
    to: classTo,
  } = usePagination(classSummaryRows, [dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (!data?.dailySummary.length && !data?.classSummary.length) return;
    const escape = (c: string | number) => `"${String(c).replace(/"/g, '""')}"`;
    const lines: string[] = [];
    if (data.dailySummary.length) {
      lines.push(["Date", "Revenue", "Payment Count"].map(escape).join(","));
      lines.push(
        ...data.dailySummary.map((d) =>
          [d.date, d.total.toFixed(2), d.count].map(escape).join(",")
        )
      );
    }
    if (data.classSummary.length) {
      if (lines.length) lines.push("");
      lines.push(
        ["Class", "Department", "Revenue", "Payment Count"].map(escape).join(",")
      );
      lines.push(
        ...data.classSummary.map((c) =>
          [c.name, c.department.code, c.total.toFixed(2), c.count]
            .map(escape)
            .join(",")
        )
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Daily_Report_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printMeta = data
    ? [
        { label: "Period", value: formatReportDateRange(dateFrom, dateTo) },
        { label: "Total Revenue", value: `$${data.totalRevenue.toLocaleString()}` },
        { label: "Total Payments", value: data.totalCount },
      ]
    : [{ label: "Period", value: formatReportDateRange(dateFrom, dateTo) }];

  return (
    <ReportPageShell
      pageTitle="Daily Report"
      onExportCsv={handleExportCSV}
      exportDisabled={!data?.dailySummary.length && !data?.classSummary.length}
      actions={
        <Link href="/reports/payment">
          <Button variant="outline" size="sm">
            ← All Reports
          </Button>
        </Link>
      }
    >
      <ReportCard>
        <ReportFilterSection
          hint={
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tuition and monthly fee deposits, by date recorded.
            </p>
          }
        >
          <ReportDateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : data ? (
          <ReportContentArea
            title="Daily Report"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatReportDateRange(dateFrom, dateTo)}
                </span>
                <ReportSummaryItem label="payments" value={data.totalCount} />
                <ReportSummaryItem label="classes" value={data.classSummary.length} />
                <span className="font-medium text-green-700 dark:text-green-400">
                  <strong className="text-gray-800 dark:text-white/80">
                    ${data.totalRevenue.toLocaleString()}
                  </strong>{" "}
                  total revenue
                </span>
              </ReportSummaryBar>
            }
          >
            <div className="space-y-8">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                  By date
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-transparent! hover:bg-transparent!">
                        <TableCell isHeader>Date</TableCell>
                        <TableCell isHeader className="text-center">
                          Payments
                        </TableCell>
                        <TableCell isHeader className="text-right">
                          Revenue
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.dailySummary.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="py-12 text-center text-gray-500">
                            No payments in this period.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedDailySummary.map((d) => (
                          <TableRow key={d.date}>
                            <TableCell>{formatDateLabel(d.date)}</TableCell>
                            <TableCell className="text-center">{d.count}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                              ${d.total.toLocaleString()}
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
                    total={dailySummaryTotal}
                    from={from}
                    to={to}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                  By class
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-transparent! hover:bg-transparent!">
                        <TableCell isHeader>Class</TableCell>
                        <TableCell isHeader>Department</TableCell>
                        <TableCell isHeader className="text-center">
                          Payments
                        </TableCell>
                        <TableCell isHeader className="text-right">
                          Revenue
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.classSummary.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-12 text-center text-gray-500">
                            No class revenue in this period.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedClassSummary.map((c) => (
                          <TableRow key={c.classId}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell>{c.department.code}</TableCell>
                            <TableCell className="text-center">{c.count}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                              ${c.total.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination
                    className="no-print"
                    page={classPage}
                    totalPages={classTotalPages}
                    total={classSummaryTotal}
                    from={classFrom}
                    to={classTo}
                    pageSize={classPageSize}
                    onPageChange={setClassPage}
                    onPageSizeChange={setClassPageSize}
                  />
                </div>
              </div>
            </div>
          </ReportContentArea>
        ) : (
          <div className="py-16 text-center text-gray-500">No data available.</div>
        )}
      </ReportCard>
    </ReportPageShell>
  );
}
