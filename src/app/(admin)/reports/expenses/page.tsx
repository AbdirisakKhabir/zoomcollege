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
import Badge from "@/components/ui/badge/Badge";
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

const STATUS_COLOR: Record<string, "warning" | "success" | "error"> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
};

export default function ExpenseReportPage() {
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useReportDateRange("year");
  const [data, setData] = useState<{
    expenses: {
      id: number;
      amount: number;
      description: string;
      category: string | null;
      status: string;
      requestedBy: { name: string | null; email: string };
      approvedBy: { name: string | null; email: string } | null;
      approvedAt: string | null;
      bank: { code: string; name: string } | null;
      createdAt: string;
    }[];
    totals: { pending: number; approved: number; rejected: number; total: number };
    dateFrom: string;
    dateTo: string;
    generatedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      if (statusFilter) params.set("status", statusFilter);
      const res = await authFetch(`/api/finance/expenses-report?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [dateFrom, dateTo, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const expensesList = data?.expenses ?? [];
  const {
    paginatedItems: paginatedExpenses,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total: expensesTotal,
    from,
    to,
  } = usePagination(expensesList, [dateFrom, dateTo, statusFilter]);

  const handleExportCSV = () => {
    if (!data?.expenses.length) return;
    exportReportCsv(
      `Expense_Report_${data.dateFrom}_${data.dateTo}.csv`,
      [
        "Date",
        "Description",
        "Category",
        "Account",
        "Amount",
        "Status",
        "Requested By",
        "Approved By",
      ],
      data.expenses.map((e) => [
        new Date(e.createdAt).toLocaleDateString(),
        e.description,
        e.category || "",
        e.bank ? `${e.bank.code} - ${e.bank.name}` : "",
        e.amount.toFixed(2),
        e.status,
        e.requestedBy?.name || e.requestedBy?.email || "",
        e.approvedBy?.name || e.approvedBy?.email || "",
      ])
    );
  };

  const printMeta = [
    { label: "Period", value: formatReportDateRange(dateFrom, dateTo) },
    ...(statusFilter
      ? [{ label: "Status", value: statusFilter }]
      : []),
    ...(data
      ? [
          { label: "Pending", value: `$${data.totals.pending.toLocaleString()}` },
          { label: "Approved", value: `$${data.totals.approved.toLocaleString()}` },
          { label: "Rejected", value: `$${data.totals.rejected.toLocaleString()}` },
          { label: "Total", value: `$${data.totals.total.toLocaleString()}` },
          { label: "Expenses", value: data.expenses.length },
        ]
      : []),
  ];

  return (
    <ReportPageShell
      pageTitle="Expense Report"
      onExportCsv={handleExportCSV}
      exportDisabled={!data?.expenses.length}
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
          <ReportFilterField label="Status">
            <ReportFilterSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              minWidth="140px"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </ReportFilterSelect>
          </ReportFilterField>
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : data ? (
          <>
            <div className="no-print grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Pending
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                  ${data.totals.pending.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Approved
                </p>
                <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                  ${data.totals.approved.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Rejected
                </p>
                <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                  ${data.totals.rejected.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
                  ${data.totals.total.toLocaleString()}
                </p>
              </div>
            </div>

            <ReportContentArea
              title="Expense Report"
              printMeta={printMeta}
              summary={
                <ReportSummaryBar>
                  <ReportSummaryItem
                    label="expenses"
                    value={data.expenses.length}
                  />
                  <span className="text-amber-700 dark:text-amber-400">
                    <strong className="text-gray-800 dark:text-white/80">
                      ${data.totals.pending.toLocaleString()}
                    </strong>{" "}
                    pending
                  </span>
                  <span className="text-green-700 dark:text-green-400">
                    <strong className="text-gray-800 dark:text-white/80">
                      ${data.totals.approved.toLocaleString()}
                    </strong>{" "}
                    approved
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    <strong className="text-gray-800 dark:text-white/80">
                      ${data.totals.rejected.toLocaleString()}
                    </strong>{" "}
                    rejected
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-800 dark:text-white/80">
                      ${data.totals.total.toLocaleString()}
                    </strong>{" "}
                    total
                  </span>
                </ReportSummaryBar>
              }
            >
              <h3 className="mb-4 font-semibold text-gray-800 dark:text-white/90">
                Expense Details
              </h3>
              <Table>
                <TableHeader>
                  <TableRow className="bg-transparent! hover:bg-transparent!">
                    <TableCell isHeader>Date</TableCell>
                    <TableCell isHeader>Description</TableCell>
                    <TableCell isHeader>Category</TableCell>
                    <TableCell isHeader>Account</TableCell>
                    <TableCell isHeader className="text-right">
                      Amount
                    </TableCell>
                    <TableCell isHeader>Status</TableCell>
                    <TableCell isHeader>Requested By</TableCell>
                    <TableCell isHeader>Approved By</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                        No expenses in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedExpenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          {new Date(e.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span
                            className="block max-w-[180px] truncate"
                            title={e.description}
                          >
                            {e.description}
                          </span>
                        </TableCell>
                        <TableCell>{e.category || "—"}</TableCell>
                        <TableCell>{e.bank ? `${e.bank.code}` : "—"}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600 dark:text-red-400">
                          ${e.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge color={STATUS_COLOR[e.status] || "info"} size="sm">
                            {e.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {e.requestedBy?.name || e.requestedBy?.email || "—"}
                        </TableCell>
                        <TableCell>
                          {e.approvedBy?.name || e.approvedBy?.email || "—"}
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
                total={expensesTotal}
                from={from}
                to={to}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </ReportContentArea>
          </>
        ) : (
          <div className="py-16 text-center text-gray-500">No data available.</div>
        )}
      </ReportCard>
    </ReportPageShell>
  );
}
