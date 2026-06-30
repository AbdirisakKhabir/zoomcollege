"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportFilterField, {
  ReportFilterSelect,
} from "@/components/reports/ReportFilterField";
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
  TablePagination,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/usePagination";
import { useReportDateRange } from "@/hooks/useReportDateRange";
import Badge from "@/components/ui/badge/Badge";
import { authFetch } from "@/lib/api";
import { formatReportDateRange } from "@/lib/report-date-range";
import { exportReportCsv } from "@/lib/report-utils";

type Bank = { id: number; name: string; code: string };
type Transaction = {
  id: number;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
  bank: { id: number; name: string; code: string };
  student: { studentId: string; firstName: string; lastName: string } | null;
  createdBy: { name: string | null; email: string } | null;
};

export default function TransactionHistoryReportPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankId, setBankId] = useState("");
  const [type, setType] = useState("");
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useReportDateRange("month");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (bankId) params.set("bankId", bankId);
      if (type) params.set("type", type);
      params.set("dateFrom", dateFrom);
      params.set("dateTo", dateTo);
      params.set("limit", "200");
      const res = await authFetch(`/api/finance/transaction-history?${params}`);
      if (res.ok) setTransactions(await res.json());
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [bankId, type, dateFrom, dateTo]);

  useEffect(() => {
    authFetch("/api/banks").then((r) => {
      if (r.ok) r.json().then(setBanks);
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const {
    paginatedItems: paginatedTransactions,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total: transactionsTotal,
    from,
    to,
  } = usePagination(transactions, [bankId, type, dateFrom, dateTo]);

  const selectedBank = banks.find((b) => String(b.id) === bankId);

  const { totalIn, totalOut, net } = useMemo(() => {
    const inAmount = transactions
      .filter((t) => t.type === "deposit" || t.type === "transfer_in")
      .reduce((s, t) => s + t.amount, 0);
    const outAmount = transactions
      .filter((t) => t.type === "withdrawal" || t.type === "transfer_out")
      .reduce((s, t) => s + t.amount, 0);
    return { totalIn: inAmount, totalOut: outAmount, net: inAmount - outAmount };
  }, [transactions]);

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    exportReportCsv(
      `Transaction_History_${dateFrom}_to_${dateTo}.csv`,
      ["Date", "Type", "Account", "Amount", "Description", "Student", "Recorded By"],
      transactions.map((t) => [
        new Date(t.createdAt).toLocaleString(),
        t.type,
        t.bank?.code || "",
        t.amount.toFixed(2),
        t.description || "",
        t.student
          ? `${t.student.firstName} ${t.student.lastName} (${t.student.studentId})`
          : "",
        t.createdBy?.name || t.createdBy?.email || "",
      ])
    );
  };

  const typeBadge = (t: string) => {
    const colors: Record<string, "success" | "error" | "info" | "primary"> = {
      deposit: "success",
      withdrawal: "error",
      transfer_out: "info",
      transfer_in: "primary",
    };
    const labels: Record<string, string> = {
      deposit: "Deposit",
      withdrawal: "Withdrawal",
      transfer_out: "Transfer Out",
      transfer_in: "Transfer In",
    };
    return (
      <Badge color={colors[t] || "info"} size="sm">
        {labels[t] || t}
      </Badge>
    );
  };

  const printMeta = [
    { label: "Period", value: formatReportDateRange(dateFrom, dateTo) },
    ...(selectedBank
      ? [{ label: "Account", value: `${selectedBank.code} — ${selectedBank.name}` }]
      : []),
    ...(type ? [{ label: "Type", value: type }] : []),
    { label: "Transactions", value: transactions.length },
    { label: "Total In", value: `$${totalIn.toLocaleString()}` },
    { label: "Total Out", value: `$${totalOut.toLocaleString()}` },
    { label: "Net", value: `$${net.toLocaleString()}` },
  ];

  return (
    <ReportPageShell
      pageTitle="Transaction History"
      onExportCsv={handleExportCSV}
      exportDisabled={transactions.length === 0}
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
              Auto-generated log of all financial transactions.
            </p>
          }
        >
          <ReportFilterField label="Account">
            <ReportFilterSelect
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
            >
              <option value="">All Accounts</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
          <ReportFilterField label="Type">
            <ReportFilterSelect
              value={type}
              onChange={(e) => setType(e.target.value)}
              minWidth="140px"
            >
              <option value="">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="transfer_out">Transfer Out</option>
              <option value="transfer_in">Transfer In</option>
            </ReportFilterSelect>
          </ReportFilterField>
          <ReportDateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : (
          <ReportContentArea
            title="Transaction History"
            printMeta={printMeta}
            summary={
              transactions.length > 0 ? (
                <ReportSummaryBar>
                  <span className="font-medium text-green-700 dark:text-green-400">
                    Total In: <strong>${totalIn.toLocaleString()}</strong>
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    Total Out: <strong>${totalOut.toLocaleString()}</strong>
                  </span>
                  <span
                    className={`font-medium ${net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    Net: <strong>${net.toLocaleString()}</strong>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-800 dark:text-white/80">
                      {transactions.length}
                    </strong>{" "}
                    transactions
                  </span>
                </ReportSummaryBar>
              ) : undefined
            }
          >
            {transactions.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                No transactions in this period. Transactions are created automatically
                when you record payments, withdrawals, or transfers.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-transparent! hover:bg-transparent!">
                      <TableCell isHeader>Date</TableCell>
                      <TableCell isHeader>Type</TableCell>
                      <TableCell isHeader>Account</TableCell>
                      <TableCell isHeader>Amount</TableCell>
                      <TableCell isHeader>Description</TableCell>
                      <TableCell isHeader>Student</TableCell>
                      <TableCell isHeader className="no-print">
                        Recorded By
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(t.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>{typeBadge(t.type)}</TableCell>
                        <TableCell className="font-mono text-sm">{t.bank?.code}</TableCell>
                        <TableCell
                          className={`font-semibold ${
                            t.type === "deposit" || t.type === "transfer_in"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {t.type === "deposit" || t.type === "transfer_in" ? "+" : "-"}$
                          {t.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span
                            className="block max-w-[200px] truncate"
                            title={t.description || ""}
                          >
                            {t.description || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {t.student
                            ? `${t.student.firstName} ${t.student.lastName} (${t.student.studentId})`
                            : "—"}
                        </TableCell>
                        <TableCell className="no-print text-sm text-gray-500">
                          {t.createdBy?.name || t.createdBy?.email || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-semibold dark:bg-gray-800/50">
                      <TableCell colSpan={3} className="text-right">
                        Total
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600">+${totalIn.toLocaleString()}</span>
                        {" / "}
                        <span className="text-red-600">-${totalOut.toLocaleString()}</span>
                      </TableCell>
                      <TableCell colSpan={3}>&nbsp;</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <TablePagination
                  className="no-print"
                  page={page}
                  totalPages={totalPages}
                  total={transactionsTotal}
                  from={from}
                  to={to}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </ReportContentArea>
        )}
      </ReportCard>
    </ReportPageShell>
  );
}
