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
import { authFetch } from "@/lib/api";
import { formatReportDateRange } from "@/lib/report-date-range";
import { exportReportCsv } from "@/lib/report-utils";

type Bank = { id: number; name: string; code: string };

type BankTransactionsData = {
  deposits: {
    id: number;
    amount: number;
    paidAt: string;
    student: { studentId: string; firstName: string; lastName: string };
    bank: { name: string; code: string };
  }[];
  withdrawals: {
    id: number;
    amount: number;
    withdrawnAt: string;
    reason: string | null;
    bank: { name: string; code: string };
  }[];
  transfersOut: {
    id: number;
    amount: number;
    transferredAt: string;
    fromBank: { name: string; code: string };
    toBank: { name: string; code: string };
  }[];
  transfersIn: {
    id: number;
    amount: number;
    transferredAt: string;
    fromBank: { name: string; code: string };
    toBank: { name: string; code: string };
  }[];
};

export default function BankTransactionsReportPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [data, setData] = useState<BankTransactionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bankId, setBankId] = useState("");
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useReportDateRange("month");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (bankId) params.set("bankId", bankId);
      params.set("dateFrom", dateFrom);
      params.set("dateTo", dateTo);
      const res = await authFetch(`/api/finance/bank-transactions?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [bankId, dateFrom, dateTo]);

  useEffect(() => {
    authFetch("/api/banks").then((r) => {
      if (r.ok) r.json().then(setBanks);
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const depositsList = data?.deposits ?? [];
  const withdrawalsList = data?.withdrawals ?? [];
  const transfersSorted = useMemo(() => {
    if (!data) return [];
    return [...data.transfersOut, ...data.transfersIn].sort(
      (a, b) => new Date(b.transferredAt).getTime() - new Date(a.transferredAt).getTime()
    );
  }, [data]);

  const selectedBank = banks.find((b) => String(b.id) === bankId);

  const totalDeposits = depositsList.reduce((s, d) => s + d.amount, 0);
  const totalWithdrawals = withdrawalsList.reduce((s, w) => s + w.amount, 0);
  const net = totalDeposits - totalWithdrawals;
  const hasData =
    depositsList.length > 0 ||
    withdrawalsList.length > 0 ||
    transfersSorted.length > 0;

  const transferResetDeps = [bankId, dateFrom, dateTo, data];
  const {
    paginatedItems: paginatedDeposits,
    page: depositsPage,
    setPage: setDepositsPage,
    pageSize: depositsPageSize,
    setPageSize: setDepositsPageSize,
    totalPages: depositsTotalPages,
    total: depositsTotal,
    from: depositsFrom,
    to: depositsTo,
  } = usePagination(depositsList, transferResetDeps);
  const {
    paginatedItems: paginatedWithdrawals,
    page: withdrawalsPage,
    setPage: setWithdrawalsPage,
    pageSize: withdrawalsPageSize,
    setPageSize: setWithdrawalsPageSize,
    totalPages: withdrawalsTotalPages,
    total: withdrawalsTotalCount,
    from: withdrawalsFrom,
    to: withdrawalsTo,
  } = usePagination(withdrawalsList, transferResetDeps);
  const {
    paginatedItems: paginatedTransfers,
    page: transfersPage,
    setPage: setTransfersPage,
    pageSize: transfersPageSize,
    setPageSize: setTransfersPageSize,
    totalPages: transfersTotalPages,
    total: transfersTotalCount,
    from: transfersFrom,
    to: transfersTo,
  } = usePagination(transfersSorted, transferResetDeps);

  const handleExportCSV = () => {
    if (!data) return;
    const rows: (string | number)[][] = [];
    data.deposits.forEach((d) => {
      rows.push([
        "Deposit",
        new Date(d.paidAt).toLocaleDateString(),
        d.bank?.code || "",
        d.amount.toFixed(2),
        `${d.student?.firstName} ${d.student?.lastName} (${d.student?.studentId})`,
      ]);
    });
    data.withdrawals.forEach((w) => {
      rows.push([
        "Withdrawal",
        new Date(w.withdrawnAt).toLocaleDateString(),
        w.bank?.code || "",
        w.amount.toFixed(2),
        w.reason || "",
      ]);
    });
    [...data.transfersOut, ...data.transfersIn].forEach((t) => {
      rows.push([
        "Transfer",
        new Date(t.transferredAt).toLocaleDateString(),
        t.fromBank?.code || "",
        t.toBank?.code || "",
        t.amount.toFixed(2),
      ]);
    });
    exportReportCsv(
      `Account_Transactions_${dateFrom}_to_${dateTo}.csv`,
      ["Type", "Date", "From / Account", "To / Detail", "Amount"],
      rows
    );
  };

  const printMeta = [
    { label: "Period", value: formatReportDateRange(dateFrom, dateTo) },
    ...(selectedBank
      ? [{ label: "Account", value: `${selectedBank.code} — ${selectedBank.name}` }]
      : []),
    { label: "Total Deposits", value: `$${totalDeposits.toLocaleString()}` },
    { label: "Total Withdrawals", value: `$${totalWithdrawals.toLocaleString()}` },
    { label: "Net", value: `$${net.toLocaleString()}` },
  ];

  return (
    <ReportPageShell
      pageTitle="Account Transactions Report"
      onExportCsv={handleExportCSV}
      exportDisabled={!hasData}
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
            title="Account Transactions Report"
            printMeta={printMeta}
            summary={
              hasData ? (
                <ReportSummaryBar>
                  <span className="font-medium text-green-700 dark:text-green-400">
                    Total Deposits: <strong>${totalDeposits.toLocaleString()}</strong>
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    Total Withdrawals: <strong>${totalWithdrawals.toLocaleString()}</strong>
                  </span>
                  <span
                    className={`font-medium ${net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    Net: <strong>${net.toLocaleString()}</strong>
                  </span>
                </ReportSummaryBar>
              ) : undefined
            }
          >
            <div className="space-y-6">
              <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                  <h3 className="font-semibold text-gray-800 dark:text-white/90">
                    Deposits (Tuition Payments)
                  </h3>
                  {depositsList.length > 0 && (
                    <span className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-bold text-green-600 dark:bg-green-500/10 dark:text-green-400">
                      Total: ${totalDeposits.toLocaleString()} ({depositsList.length})
                    </span>
                  )}
                </div>
                {depositsList.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    No deposits in this period.
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-transparent! hover:bg-transparent!">
                          <TableCell isHeader>Date</TableCell>
                          <TableCell isHeader>Student</TableCell>
                          <TableCell isHeader>Account</TableCell>
                          <TableCell isHeader className="text-right">
                            Amount
                          </TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedDeposits.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell>{new Date(d.paidAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {d.student?.firstName} {d.student?.lastName} ({d.student?.studentId})
                            </TableCell>
                            <TableCell>{d.bank?.code}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              +${d.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-gray-50 font-semibold dark:bg-gray-800/50">
                          <TableCell colSpan={3} className="text-right">
                            Total
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            +${totalDeposits.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    <TablePagination
                      className="no-print"
                      page={depositsPage}
                      totalPages={depositsTotalPages}
                      total={depositsTotal}
                      from={depositsFrom}
                      to={depositsTo}
                      pageSize={depositsPageSize}
                      onPageChange={setDepositsPage}
                      onPageSizeChange={setDepositsPageSize}
                    />
                  </>
                )}
              </div>

              <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                  <h3 className="font-semibold text-gray-800 dark:text-white/90">
                    Withdrawals
                  </h3>
                  {withdrawalsList.length > 0 && (
                    <span className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                      Total: ${totalWithdrawals.toLocaleString()} ({withdrawalsList.length})
                    </span>
                  )}
                </div>
                {withdrawalsList.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    No withdrawals in this period.
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-transparent! hover:bg-transparent!">
                          <TableCell isHeader>Date</TableCell>
                          <TableCell isHeader>Account</TableCell>
                          <TableCell isHeader>Reason</TableCell>
                          <TableCell isHeader className="text-right">
                            Amount
                          </TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedWithdrawals.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell>{new Date(w.withdrawnAt).toLocaleDateString()}</TableCell>
                            <TableCell>{w.bank?.code}</TableCell>
                            <TableCell>{w.reason || "—"}</TableCell>
                            <TableCell className="text-right font-medium text-red-600">
                              -${w.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-gray-50 font-semibold dark:bg-gray-800/50">
                          <TableCell colSpan={3} className="text-right">
                            Total
                          </TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            -${totalWithdrawals.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    <TablePagination
                      className="no-print"
                      page={withdrawalsPage}
                      totalPages={withdrawalsTotalPages}
                      total={withdrawalsTotalCount}
                      from={withdrawalsFrom}
                      to={withdrawalsTo}
                      pageSize={withdrawalsPageSize}
                      onPageChange={setWithdrawalsPage}
                      onPageSizeChange={setWithdrawalsPageSize}
                    />
                  </>
                )}
              </div>

              <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                  <h3 className="font-semibold text-gray-800 dark:text-white/90">Transfers</h3>
                </div>
                {transfersSorted.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    No transfers in this period.
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-transparent! hover:bg-transparent!">
                          <TableCell isHeader>Date</TableCell>
                          <TableCell isHeader>From</TableCell>
                          <TableCell isHeader>To</TableCell>
                          <TableCell isHeader className="text-right">
                            Amount
                          </TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTransfers.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>{new Date(t.transferredAt).toLocaleDateString()}</TableCell>
                            <TableCell>{t.fromBank?.code}</TableCell>
                            <TableCell>{t.toBank?.code}</TableCell>
                            <TableCell className="text-right font-medium">
                              ${t.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <TablePagination
                      className="no-print"
                      page={transfersPage}
                      totalPages={transfersTotalPages}
                      total={transfersTotalCount}
                      from={transfersFrom}
                      to={transfersTo}
                      pageSize={transfersPageSize}
                      onPageChange={setTransfersPage}
                      onPageSizeChange={setTransfersPageSize}
                    />
                  </>
                )}
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
