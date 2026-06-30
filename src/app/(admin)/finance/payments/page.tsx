"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import ReportDateRangeFilter from "@/components/reports/ReportDateRangeFilter";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/hooks/usePagination";
import { useReportDateRange } from "@/hooks/useReportDateRange";
import { authFetch } from "@/lib/api";
import { formatReportDateRange } from "@/lib/report-date-range";
import { useAuth } from "@/context/AuthContext";
import { CalendarDays, CreditCard, List, Wallet } from "lucide-react";

export type FinancePaymentRow =
  | {
      kind: "tuition";
      id: number;
      amount: number;
      year: number;
      paymentMethod: string;
      receiptNumber: string | null;
      transactionId: string | null;
      paymentDate: string;
      paidAt: string;
      note: string | null;
      bank: { id: number; name: string; code: string } | null;
      student: {
        studentId: string;
        firstName: string;
        lastName: string;
        department: { name: string; code: string };
      };
      recordedBy: { id: number; name: string | null; email: string } | null;
    }
  | {
      kind: "monthly";
      id: number;
      batchId: string;
      calendarYear: number;
      month: number;
      amount: number;
      paymentMethod: string;
      receiptNumber: string | null;
      transactionId: string | null;
      paymentDate: string;
      paidAt: string;
      note: string | null;
      bank: { id: number; name: string; code: string } | null;
      student: {
        studentId: string;
        firstName: string;
        lastName: string;
        department: { name: string; code: string };
      };
      recordedBy: { id: number; name: string | null; email: string } | null;
    };

type PaymentTab = "all" | "registration" | "monthly";

type Bank = { id: number; name: string; code: string };
type Department = { id: number; name: string; code: string };

const TABS: { id: PaymentTab; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All payments", icon: <List className="h-4 w-4" strokeWidth={1.75} /> },
  {
    id: "registration",
    label: "Registration",
    icon: <CreditCard className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    id: "monthly",
    label: "Monthly fees",
    icon: <CalendarDays className="h-4 w-4" strokeWidth={1.75} />,
  },
];

function monthName(m: number): string {
  return new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" });
}

function paymentReference(p: FinancePaymentRow) {
  if (p.receiptNumber?.trim()) return p.receiptNumber.trim();
  if (p.transactionId?.trim()) return p.transactionId.trim();
  if (p.note?.trim()) return p.note.trim();
  return "—";
}

function paymentMethodAccount(p: FinancePaymentRow) {
  return p.bank ? `${p.bank.code} · ${p.bank.name}` : "—";
}

function periodLabel(p: FinancePaymentRow) {
  if (p.kind === "tuition") {
    return "Registration";
  }
  return `${monthName(p.month)} ${p.calendarYear}`;
}

function paymentTypeLabel(p: FinancePaymentRow) {
  return p.kind === "tuition" ? "Registration" : "Monthly fee";
}

const selectClassName =
  "h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-700 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-gray-300";

export default function FinancePaymentsPage() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<PaymentTab>("all");
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useReportDateRange("year");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterBank, setFilterBank] = useState("all");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [financePayments, setFinancePayments] = useState<FinancePaymentRow[]>([]);
  const [financeTotal, setFinanceTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [financePage, setFinancePage] = useState(1);
  const [financePageSize, setFinancePageSize] = useState(DEFAULT_PAGE_SIZE);
  const [financeLoading, setFinanceLoading] = useState(false);

  useEffect(() => {
    authFetch("/api/banks").then((r) => {
      if (r.ok) r.json().then(setBanks);
    });
    authFetch("/api/departments").then((r) => {
      if (r.ok) r.json().then(setDepartments);
    });
  }, []);

  const fetchFinancePayments = useCallback(async () => {
    setFinanceLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(financePage),
        pageSize: String(financePageSize),
        type: activeTab,
        dateFrom,
        dateTo,
      });
      if (search.trim()) params.set("q", search.trim());
      if (filterDept !== "all") params.set("departmentId", filterDept);
      if (filterBank !== "all") params.set("bankId", filterBank);

      const res = await authFetch(`/api/finance/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFinancePayments(Array.isArray(data.items) ? data.items : []);
        setFinanceTotal(typeof data.total === "number" ? data.total : 0);
        setTotalAmount(data.summary?.totalAmount ?? 0);
      } else {
        setFinancePayments([]);
        setFinanceTotal(0);
        setTotalAmount(0);
      }
    } catch {
      setFinancePayments([]);
      setFinanceTotal(0);
      setTotalAmount(0);
    } finally {
      setFinanceLoading(false);
    }
  }, [
    activeTab,
    dateFrom,
    dateTo,
    search,
    filterDept,
    filterBank,
    financePage,
    financePageSize,
  ]);

  useEffect(() => {
    void fetchFinancePayments();
  }, [fetchFinancePayments]);

  useEffect(() => {
    setFinancePage(1);
  }, [activeTab, dateFrom, dateTo, search, filterDept, filterBank]);

  const financeTotalPages = Math.max(1, Math.ceil(financeTotal / financePageSize) || 1);
  const financeFrom = financeTotal === 0 ? 0 : (financePage - 1) * financePageSize + 1;
  const financeTo = Math.min(financePage * financePageSize, financeTotal);

  useEffect(() => {
    if (financeTotal > 0 && financePage > financeTotalPages) {
      setFinancePage(financeTotalPages);
    }
  }, [financeTotal, financePage, financeTotalPages]);

  if (!hasPermission("finance.view") && !hasPermission("admission.view") && !hasPermission("dashboard.view")) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Payments" />
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-white/5">
          <p className="text-gray-500 dark:text-gray-400">You do not have permission to view Payments.</p>
        </div>
      </div>
    );
  }

  const tabDescription =
    activeTab === "registration"
      ? "One-time registration fee payments."
      : activeTab === "monthly"
        ? "Monthly fee collections."
        : "Registration and monthly fee payments.";

  return (
    <div>
      <PageBreadCrumb pageTitle="Payments" />

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/finance/tuition-payment"
          className="font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Collect registration fee
        </Link>
        <span className="text-gray-300 dark:text-gray-600" aria-hidden>
          ·
        </span>
        <Link
          href="/finance/collect-monthly-fee"
          className="font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Collect monthly fee
        </Link>
        <span className="text-gray-300 dark:text-gray-600" aria-hidden>
          ·
        </span>
        <Link href="/finance/banks" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Manage accounts
        </Link>
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
        <div className="border-b border-gray-200 px-5 pt-4 dark:border-gray-800">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Wallet className="h-5 w-5 shrink-0 text-brand-500" strokeWidth={1.75} />
                Payments
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{tabDescription}</p>
            </div>
            {financeTotal > 0 && (
              <div className="rounded-xl bg-green-50 px-4 py-2 text-sm dark:bg-green-500/10">
                <span className="text-gray-600 dark:text-gray-400">Filtered total: </span>
                <span className="font-semibold text-green-700 dark:text-green-400">
                  ${totalAmount.toLocaleString()}
                </span>
                <span className="ml-2 text-gray-500">({financeTotal} records)</span>
              </div>
            )}
          </div>

          <div className="flex gap-1 overflow-x-auto" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "border-brand-500 text-brand-600 dark:text-brand-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <ReportDateRangeFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <div className="w-full sm:w-52">
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Search student
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or student ID"
                className={`w-full ${selectClassName}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Department
              </label>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className={selectClassName}
              >
                <option value="all">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Payment method
              </label>
              <select
                value={filterBank}
                onChange={(e) => setFilterBank(e.target.value)}
                className={selectClassName}
              >
                <option value="all">All payment methods</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Period: {formatReportDateRange(dateFrom, dateTo)}
          </p>
        </div>

        <div className="p-0">
          {financeLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
            </div>
          ) : financeTotal === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                <Wallet className="h-6 w-6 text-gray-400" strokeWidth={1.75} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No payments match the selected tab and filters.
              </p>
              <Link
                href={
                  activeTab === "registration"
                    ? "/finance/tuition-payment"
                    : "/finance/collect-monthly-fee"
                }
                className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                {activeTab === "registration"
                  ? "Collect registration fee"
                  : activeTab === "monthly"
                    ? "Collect monthly fee"
                    : "Collect a payment"}
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-transparent! hover:bg-transparent!">
                      <TableCell isHeader>Date</TableCell>
                      {activeTab === "all" && <TableCell isHeader>Type</TableCell>}
                      <TableCell isHeader>Student</TableCell>
                      <TableCell isHeader>Period</TableCell>
                      <TableCell isHeader className="text-right">
                        Amount
                      </TableCell>
                      <TableCell isHeader>Payment method</TableCell>
                      <TableCell isHeader>Reference</TableCell>
                      <TableCell isHeader>Recorded by</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financePayments.map((p) => (
                      <TableRow key={`${p.kind}-${p.id}`}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </TableCell>
                        {activeTab === "all" && (
                          <TableCell className="whitespace-nowrap text-gray-600 dark:text-gray-300">
                            {paymentTypeLabel(p)}
                          </TableCell>
                        )}
                        <TableCell>
                          <Link
                            href={`/students/${encodeURIComponent(p.student.studentId)}`}
                            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                          >
                            {p.student.firstName} {p.student.lastName}
                          </Link>
                          <span className="ml-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                            {p.student.studentId}
                          </span>
                          <div className="text-xs text-gray-500">{p.student.department.code}</div>
                        </TableCell>
                        <TableCell>
                          <span title={p.kind === "monthly" ? `Batch ${p.batchId}` : undefined}>
                            {periodLabel(p)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                          ${Number(p.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>{paymentMethodAccount(p)}</TableCell>
                        <TableCell className="max-w-[140px] text-gray-600 dark:text-gray-300">
                          <span className="block truncate" title={paymentReference(p)}>
                            {paymentReference(p)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {p.recordedBy?.name || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                page={financePage}
                totalPages={financeTotalPages}
                total={financeTotal}
                from={financeFrom}
                to={financeTo}
                pageSize={financePageSize}
                onPageChange={setFinancePage}
                onPageSizeChange={setFinancePageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
