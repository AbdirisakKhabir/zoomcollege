"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportContentArea from "@/components/reports/ReportContentArea";
import ReportSummaryBar from "@/components/reports/ReportSummaryBar";
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
import { exportReportCsv } from "@/lib/report-utils";

type Bank = {
  id: number;
  name: string;
  code: string;
  balance: number;
  accountNumber?: string | null;
};

export default function BankBalancesReportPage() {
  const [data, setData] = useState<{
    banks: Bank[];
    totalBalance: number;
    generatedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/finance/bank-balances");
      if (res.ok) setData(await res.json());
    } catch {
      /* empty */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const banksList = data?.banks ?? [];
  const {
    paginatedItems: paginatedBanks,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total: banksTotal,
    from,
    to,
  } = usePagination(banksList, [data]);

  const handleExportCSV = () => {
    if (!data?.banks.length) return;
    exportReportCsv(
      `Account_Balances_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Code", "Name", "Account Number", "Balance"],
      data.banks.map((b) => [
        b.code,
        b.name,
        b.accountNumber || "",
        (b.balance ?? 0).toFixed(2),
      ])
    );
  };

  const printMeta = data
    ? [
        { label: "Accounts", value: data.banks.length },
        {
          label: "Total Balance",
          value: `$${data.totalBalance.toLocaleString()}`,
        },
        {
          label: "Generated",
          value: new Date(data.generatedAt).toLocaleString(),
        },
      ]
    : [];

  return (
    <ReportPageShell
      pageTitle="Account Balances Report"
      onExportCsv={handleExportCSV}
      exportDisabled={!data?.banks.length}
      actions={
        <Link href="/reports/payment">
          <Button variant="outline" size="sm">
            ← All Reports
          </Button>
        </Link>
      }
    >
      <ReportCard>
        {loading ? (
          <ReportLoadingState />
        ) : data ? (
          <ReportContentArea
            title="Account Balances Report"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <span className="text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-800 dark:text-white/80">
                    {data.banks.length}
                  </strong>{" "}
                  {data.banks.length === 1 ? "account" : "accounts"}
                </span>
                <span className="text-brand-700 dark:text-brand-400">
                  <strong className="text-gray-800 dark:text-white/80">
                    ${data.totalBalance.toLocaleString()}
                  </strong>{" "}
                  total balance
                </span>
              </ReportSummaryBar>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-transparent! hover:bg-transparent!">
                    <TableCell isHeader>#</TableCell>
                    <TableCell isHeader>Code</TableCell>
                    <TableCell isHeader>Account Name</TableCell>
                    <TableCell isHeader>Account Number</TableCell>
                    <TableCell isHeader className="text-right">
                      Balance
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBanks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-gray-500">
                        No bank accounts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedBanks.map((b, idx) => (
                      <TableRow key={b.id}>
                        <TableCell className="text-gray-500">
                          {(page - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell className="font-mono font-medium">{b.code}</TableCell>
                        <TableCell>{b.name}</TableCell>
                        <TableCell>{b.accountNumber || "—"}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                          ${(b.balance ?? 0).toLocaleString()}
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
                total={banksTotal}
                from={from}
                to={to}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </ReportContentArea>
        ) : (
          <div className="py-16 text-center text-gray-500">No data available.</div>
        )}
      </ReportCard>
    </ReportPageShell>
  );
}
