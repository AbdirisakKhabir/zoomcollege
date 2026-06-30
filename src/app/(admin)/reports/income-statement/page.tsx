"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportDateRangeFilter from "@/components/reports/ReportDateRangeFilter";
import ReportContentArea from "@/components/reports/ReportContentArea";
import ReportSummaryBar from "@/components/reports/ReportSummaryBar";
import ReportLoadingState from "@/components/reports/ReportLoadingState";
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BRAND } from "@/lib/brand";
import { authFetch } from "@/lib/api";
import { useReportDateRange } from "@/hooks/useReportDateRange";
import { formatReportDateLabel } from "@/lib/report-date-range";
import { exportReportCsv } from "@/lib/report-utils";

type IncomeStatementData = {
  dateFrom: string;
  dateTo: string;
  revenue: {
    registrationFee: number;
    monthlyFee: number;
    total: number;
    registrationPaymentCount: number;
    monthlyPaymentCount: number;
    paymentCount: number;
  };
  expenses: {
    approvedExpenses: number;
    approvedCount: number;
    withdrawals: number;
    withdrawalCount: number;
    total: number;
  };
  expenseCategories: { category: string; amount: number; count: number }[];
  netIncome: number;
  generatedAt: string;
};

type StatementRow = {
  key: string;
  label: string;
  count: number | null;
  amount: number | null;
  section?: "header" | "subtotal" | "total" | "category";
  emphasis?: "revenue" | "expense" | "net";
};

function buildStatementRows(data: IncomeStatementData): StatementRow[] {
  const rows: StatementRow[] = [
    { key: "rev-header", label: "Revenue", count: null, amount: null, section: "header" },
    {
      key: "registration",
      label: "Registration Fee",
      count: data.revenue.registrationPaymentCount,
      amount: data.revenue.registrationFee,
    },
    {
      key: "monthly",
      label: "Monthly Fee",
      count: data.revenue.monthlyPaymentCount,
      amount: data.revenue.monthlyFee,
    },
    {
      key: "rev-total",
      label: "Total Revenue",
      count: data.revenue.paymentCount,
      amount: data.revenue.total,
      section: "subtotal",
      emphasis: "revenue",
    },
    { key: "exp-header", label: "Expenses", count: null, amount: null, section: "header" },
    {
      key: "approved",
      label: "Approved Expenses",
      count: data.expenses.approvedCount,
      amount: data.expenses.approvedExpenses,
    },
    {
      key: "withdrawals",
      label: "Account Withdrawals",
      count: data.expenses.withdrawalCount,
      amount: data.expenses.withdrawals,
    },
  ];

  for (const c of data.expenseCategories) {
    rows.push({
      key: `cat-${c.category}`,
      label: `  ${c.category}`,
      count: c.count,
      amount: c.amount,
      section: "category",
    });
  }

  rows.push({
    key: "exp-total",
    label: "Total Expenses",
    count: data.expenses.approvedCount + data.expenses.withdrawalCount,
    amount: data.expenses.total,
    section: "subtotal",
    emphasis: "expense",
  });

  rows.push({
    key: "net",
    label: "Net Income",
    count: null,
    amount: data.netIncome,
    section: "total",
    emphasis: "net",
  });

  return rows;
}

export default function IncomeStatementReportPage() {
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useReportDateRange("year");
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      const res = await authFetch(`/api/finance/income-statement?${params}`);
      if (res.ok) setData(await res.json());
      else setData(null);
    } catch {
      setData(null);
    }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statementRows = useMemo(() => (data ? buildStatementRows(data) : []), [data]);

  const handleExportCSV = () => {
    if (!data) return;
    exportReportCsv(
      `Income_Statement_${data.dateFrom}_${data.dateTo}.csv`,
      ["Description", "Records", "Amount"],
      [
        ["Period", `${data.dateFrom} to ${data.dateTo}`, ""],
        ["Generated", new Date(data.generatedAt).toLocaleString(), ""],
        ["", "", ""],
        ...statementRows
          .filter((r) => r.section !== "header")
          .map((r) => [
            r.label.trim(),
            r.count != null ? r.count : "",
            r.amount != null ? r.amount : "",
          ]),
      ]
    );
  };

  const printMeta = data
    ? [
        { label: "Period", value: `${formatReportDateLabel(data.dateFrom)} – ${formatReportDateLabel(data.dateTo)}` },
        {
          label: "Generated",
          value: new Date(data.generatedAt).toLocaleString(),
        },
        { label: "Total Revenue", value: `$${data.revenue.total.toLocaleString()}` },
        { label: "Total Expenses", value: `$${data.expenses.total.toLocaleString()}` },
        {
          label: "Net Income",
          value: `$${data.netIncome.toLocaleString()}${data.netIncome < 0 ? " (Deficit)" : ""}`,
        },
      ]
    : [
        { label: "Start", value: dateFrom },
        { label: "End", value: dateTo },
      ];

  return (
    <ReportPageShell
      pageTitle="Income Statement"
      onExportCsv={handleExportCSV}
      exportDisabled={!data}
      actions={
        <Link href="/reports/payment">
          <Button variant="outline" size="sm">
            ← All Reports
          </Button>
        </Link>
      }
    >
      <ReportCard className="shadow-sm dark:shadow-none">
        <ReportFilterSection>
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
            title="Income Statement"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatReportDateLabel(data.dateFrom)} – {formatReportDateLabel(data.dateTo)}
                </span>
                <span className="font-medium text-green-700 dark:text-green-400">
                  Revenue: <strong>${data.revenue.total.toLocaleString()}</strong>
                </span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  Expenses: <strong>${data.expenses.total.toLocaleString()}</strong>
                </span>
                <span
                  className={`font-semibold ${
                    data.netIncome >= 0
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  Net: ${Math.abs(data.netIncome).toLocaleString()}
                  {data.netIncome < 0 ? " (Deficit)" : ""}
                </span>
              </ReportSummaryBar>
            }
          >
            <div className="mb-4 px-1 text-sm text-gray-500 dark:text-gray-400">
              {BRAND.name} · Income statement for the selected period
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-white/5">
                    <TableCell isHeader className="w-[50%]">
                      Description
                    </TableCell>
                    <TableCell isHeader className="text-center">
                      Records
                    </TableCell>
                    <TableCell isHeader className="text-right">
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statementRows.map((row) => {
                    if (row.section === "header") {
                      return (
                        <TableRow
                          key={row.key}
                          className="bg-gray-50/80 dark:bg-white/[0.03]"
                        >
                          <TableCell
                            colSpan={3}
                            className="py-2.5 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400"
                          >
                            {row.label}
                          </TableCell>
                        </TableRow>
                      );
                    }

                    const amountClass =
                      row.emphasis === "revenue"
                        ? "font-bold text-green-700 dark:text-green-400"
                        : row.emphasis === "expense"
                          ? "font-bold text-red-600 dark:text-red-400"
                          : row.emphasis === "net"
                            ? `font-bold text-lg ${
                                (row.amount ?? 0) >= 0
                                  ? "text-green-700 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`
                            : row.section === "category"
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-800 dark:text-white/90";

                    const labelClass =
                      row.section === "subtotal" || row.section === "total"
                        ? "font-semibold text-gray-900 dark:text-white"
                        : row.section === "category"
                          ? "text-sm text-gray-600 dark:text-gray-400"
                          : "text-gray-800 dark:text-white/90";

                    const rowBg =
                      row.section === "subtotal" || row.section === "total"
                        ? "bg-gray-50/60 dark:bg-white/[0.03]"
                        : "";

                    return (
                      <TableRow key={row.key} className={rowBg}>
                        <TableCell className={labelClass}>{row.label}</TableCell>
                        <TableCell className="text-center text-gray-600 dark:text-gray-400">
                          {row.count != null ? row.count : "—"}
                        </TableCell>
                        <TableCell className={`text-right ${amountClass}`}>
                          {row.amount != null
                            ? `$${row.amount.toLocaleString()}${row.emphasis === "net" && row.amount < 0 ? " (Deficit)" : ""}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Generated on {new Date(data.generatedAt).toLocaleString()} · Revenue and expenses
              are based on payment dates within the selected range.
            </p>
          </ReportContentArea>
        ) : (
          <div className="py-16 text-center text-gray-500">No data available.</div>
        )}
      </ReportCard>
    </ReportPageShell>
  );
}
