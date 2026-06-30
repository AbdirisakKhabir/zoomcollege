"use client";

import React, { useEffect, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { DateInput } from "@/components/form/DateInput";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/ui/table";
import { globalRowIndex, usePagination } from "@/hooks/usePagination";
import { authFetch } from "@/lib/api";
import {
  openMonthlyFeeReceipt,
  type MonthlyFeeReceipt,
} from "@/lib/monthly-fee-receipt";
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  List,
} from "lucide-react";

type FinancePaymentRow =
  | {
      kind: "tuition";
      id: number;
      amount: number;
            year: number;
      paymentMethod: string;
      paymentDate: string;
      bank: { id: number; name: string; code: string } | null;
    }
  | {
      kind: "monthly";
      id: number;
      amount: number;
      month: number;
      calendarYear: number;
      paymentMethod: string;
      paymentDate: string;
      bank: { id: number; name: string; code: string } | null;
    };

type Bank = {
  id: number;
  name: string;
  code: string;
  balance: number;
  accountNumber?: string | null;
};

type ClassOption = {
  id: number;
  name: string;
    year: number;
  department: { code: string; name: string };
};

type BalanceListStudent = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  gender: string | null;
  email: string | null;
  status: string;
  balance: number;
  department: { name: string; code: string; registrationFee: number | null };
  class: { id: number; name: string } | null;
  monthlyFee: number;
  paidForMonth: boolean;
  monthPaymentAmount: number;
  invoicedForMonth: boolean;
  monthInvoiceAmount: number;
};

const STATUS_COLOR: Record<string, "warning" | "success" | "error" | "info" | "primary"> = {
  Pending: "warning",
  Admitted: "success",
  Rejected: "error",
  Graduated: "info",
};

type Props = {
  canRecord: boolean;
  banks: Bank[];
  onBanksRefresh?: () => void;
};

function monthName(m: number): string {
  return new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" });
}

function paymentPeriodLabel(p: FinancePaymentRow): string {
  if (p.kind === "tuition") return "Registration";
  return `${monthName(p.month)} ${p.calendarYear}`;
}

const PAYMENT_METHODS = [
  { value: "cash_on_hand", label: "Cash on Hand" },
  { value: "bank_receipt", label: "Account Receipt" },
  { value: "electronic", label: "Electronic" },
] as const;

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition-all placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-600 dark:bg-gray-900/80 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20";
const selectClass =
  "h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-600 dark:bg-gray-900/80 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/20";

const modalLabelClass =
  "mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";
const modalInputClass =
  "h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-600 dark:bg-gray-900/80 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20";
const modalSelectClass =
  "h-9 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-600 dark:bg-gray-900/80 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/20";

export default function MonthlyFeeCollectionForm({
  canRecord,
  banks,
  onBanksRefresh,
}: Props) {
  const now = new Date();
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [filterClassId, setFilterClassId] = useState("all");
  const [filterDate, setFilterDate] = useState(now.toISOString().slice(0, 10));
  const [balanceList, setBalanceList] = useState<BalanceListStudent[]>([]);
  const [balanceSummary, setBalanceSummary] = useState({
    count: 0,
    totalBalance: 0,
    unpaidForMonth: 0,
  });
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceYear, setBalanceYear] = useState(now.getFullYear());
  const [balanceMonth, setBalanceMonth] = useState(now.getMonth() + 1);

  const [paymentStudent, setPaymentStudent] = useState<BalanceListStudent | null>(null);
  const [historyStudent, setHistoryStudent] = useState<BalanceListStudent | null>(null);
  const [historyPayments, setHistoryPayments] = useState<FinancePaymentRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [year, setYear] = useState(String(now.getFullYear()));
  const [paymentMonth, setPaymentMonth] = useState(String(now.getMonth() + 1));
  const [feeBeforeDiscount, setFeeBeforeDiscount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash_on_hand");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentDate, setPaymentDate] = useState(now.toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [lastReceipt, setLastReceipt] = useState<MonthlyFeeReceipt | null>(null);

  const loadBalanceList = async () => {
    setBalanceLoading(true);
    try {
      const params = new URLSearchParams({ date: filterDate });
      if (filterClassId && filterClassId !== "all") {
        params.set("classId", filterClassId);
      }
      const res = await authFetch(`/api/finance/monthly-payments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBalanceList(data.students ?? []);
        setBalanceSummary(
          data.summary ?? { count: 0, totalBalance: 0, unpaidForMonth: 0 }
        );
        setBalanceYear(data.year ?? now.getFullYear());
        setBalanceMonth(data.month ?? now.getMonth() + 1);
      } else {
        setBalanceList([]);
        setBalanceSummary({ count: 0, totalBalance: 0, unpaidForMonth: 0 });
      }
    } catch {
      setBalanceList([]);
      setBalanceSummary({ count: 0, totalBalance: 0, unpaidForMonth: 0 });
    }
    setBalanceLoading(false);
  };

  useEffect(() => {
    authFetch("/api/classes").then((r) => {
      if (r.ok) r.json().then((d: ClassOption[]) => setClassOptions(d));
    });
  }, []);

  useEffect(() => {
    void loadBalanceList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterClassId, filterDate]);

  const {
    paginatedItems: paginatedBalanceRows,
    page: balancePage,
    setPage: setBalancePage,
    pageSize: balancePageSize,
    setPageSize: setBalancePageSize,
    totalPages: balanceTotalPages,
    total: balanceTotal,
    from: balanceFrom,
    to: balanceTo,
  } = usePagination(balanceList, [filterClassId, filterDate, balanceList]);

  const openPaymentModal = (s: BalanceListStudent) => {
    setPaymentStudent(s);
    setError("");
    setLastReceipt(null);
    setYear(String(balanceYear));
    setPaymentMonth(String(balanceMonth));
    setDiscountAmount("");
    const amountDue = s.balance > 0 ? s.balance : 0;
    setFeeBeforeDiscount(amountDue);
    setDepositAmount(amountDue > 0 ? String(amountDue) : "");
    setPaymentMethod("cash_on_hand");
    setReceiptNumber("");
    setTransactionId("");
    setPaymentDate(now.toISOString().slice(0, 10));
    setDescription("Received payment");
  };

  const closePaymentModal = () => {
    setPaymentStudent(null);
    setError("");
    setLastReceipt(null);
  };

  const openHistoryModal = async (s: BalanceListStudent) => {
    setHistoryStudent(s);
    setHistoryPayments([]);
    setHistoryLoading(true);
    try {
      const res = await authFetch(
        `/api/finance/payments?studentId=${encodeURIComponent(s.studentId)}&pageSize=100`
      );
      if (res.ok) {
        const data = await res.json();
        setHistoryPayments(data.items ?? []);
      }
    } catch {
      setHistoryPayments([]);
    }
    setHistoryLoading(false);
  };

  const closeHistoryModal = () => {
    setHistoryStudent(null);
    setHistoryPayments([]);
  };

  const currentCalendarYear = now.getFullYear();
  const yearOptions = Array.from({ length: 21 }, (_, i) => currentCalendarYear - 8 + i);
  const deposit = Number(depositAmount);
  const discount = discountAmount.trim() === "" ? 0 : Number(discountAmount);
  const balanceAfterPayment =
    paymentStudent &&
    Number.isFinite(deposit) &&
    deposit >= 0 &&
    Number.isFinite(discount) &&
    discount >= 0
      ? Math.max(0, paymentStudent.balance - deposit - discount)
      : paymentStudent?.balance ?? 0;

  const handleDiscountChange = (value: string) => {
    setDiscountAmount(value);
    const nextDiscount = value.trim() === "" ? 0 : Number(value);
    if (value.trim() !== "" && (!Number.isFinite(nextDiscount) || nextDiscount < 0)) {
      return;
    }
    const paid = Math.max(
      0,
      Math.round((feeBeforeDiscount - nextDiscount) * 100) / 100
    );
    setDepositAmount(String(paid));
  };

  const handleAmountPaidChange = (value: string) => {
    setDepositAmount(value);
  };

  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLastReceipt(null);
    if (!paymentStudent) {
      setError("No student selected.");
      return;
    }
    const monthNum = Number(paymentMonth);
    if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      setError("Select a valid month.");
      return;
    }
    if (!Number.isFinite(deposit) || deposit < 0) {
      setError("Enter a valid amount paid.");
      return;
    }
    if (discountAmount.trim() !== "" && (!Number.isFinite(discount) || discount < 0)) {
      setError("Enter a valid discount amount.");
      return;
    }
    if (deposit + discount <= 0) {
      setError("Enter an amount paid and/or discount.");
      return;
    }
    if (discount > feeBeforeDiscount) {
      setError("Discount cannot exceed the current balance.");
      return;
    }
    if (deposit + discount > feeBeforeDiscount + 0.001) {
      setError("Amount paid and discount together cannot exceed the current balance.");
      return;
    }
    if (paymentMethod === "bank_receipt" && !receiptNumber.trim()) {
      setError("Receipt number is required for account receipt payments.");
      return;
    }
    if (paymentMethod === "electronic" && !transactionId.trim()) {
      setError("Transaction ID is required for electronic payments.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch("/api/finance/monthly-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: paymentStudent.studentId,
          year: Number(year),
          months: [monthNum],
          depositAmount: deposit,
          discountAmount: discount,
          paymentMethod,
          receiptNumber: receiptNumber.trim() || undefined,
          transactionId: transactionId.trim() || undefined,
          bankId: banks[0]?.id,
          paymentDate: paymentDate || undefined,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save payment");
        return;
      }
      setLastReceipt(data as MonthlyFeeReceipt);
      onBanksRefresh?.();
      void loadBalanceList();
      openMonthlyFeeReceipt(data as MonthlyFeeReceipt);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const paymentInitials = paymentStudent
    ? `${paymentStudent.firstName?.[0] ?? ""}${paymentStudent.lastName?.[0] ?? ""}`.toUpperCase() ||
      "?"
    : "";

  return (
    <>
      <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full sm:w-56">
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Class
              </label>
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className={selectClass}
              >
                <option value="all">All classes</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.department?.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-48">
              <DateInput
                id="balance-filter-date"
                label="Billing month"
                labelClassName="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400"
                value={filterDate}
                onChange={setFilterDate}
                inputClassName={inputClass}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadBalanceList()}
              disabled={balanceLoading}
            >
              {balanceLoading ? "Loading…" : "Refresh"}
            </Button>
          </div>
          {!balanceLoading && balanceSummary.count > 0 && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {balanceSummary.count} student{balanceSummary.count === 1 ? "" : "s"} · Total
              balance{" "}
              <strong className="text-gray-800 dark:text-white/90">
                $
                {balanceSummary.totalBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
              {" · "}
              {balanceSummary.unpaidForMonth} unpaid for{" "}
              {new Date(balanceYear, balanceMonth - 1, 1).toLocaleString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {balanceLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : balanceList.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            No students with an outstanding balance match these filters.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="w-10 px-3 py-3 text-center text-xs font-semibold uppercase text-gray-600 dark:text-gray-300"
                    >
                      #
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300"
                    >
                      Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300"
                    >
                      ID
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300"
                    >
                      Phone
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300"
                    >
                      Gender
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300"
                    >
                      Department
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300"
                    >
                      Class
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-300"
                    >
                      Status
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-3 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-300"
                    >
                      Balance
                    </TableCell>
                    <TableCell
                      isHeader
                      className="min-w-[260px] whitespace-nowrap px-3 py-3 text-center text-xs font-semibold uppercase text-gray-600 dark:text-gray-300"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBalanceRows.map((s, idx) => (
                    <TableRow
                      key={s.id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <TableCell className="px-3 py-2.5 text-center text-sm text-gray-500">
                        {globalRowIndex(balancePage, balancePageSize, idx)}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 font-medium text-gray-800 dark:text-white/90">
                        {s.firstName} {s.lastName}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 font-mono text-sm text-gray-600 dark:text-gray-400">
                        {s.studentId}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400">
                        {s.phone || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400">
                        {s.gender || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400">
                        {s.department ? (
                          <>
                            <span className="font-medium">{s.department.code}</span>
                            <span className="block text-xs text-gray-400">{s.department.name}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400">
                        {s.class ? s.class.name : "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Badge color={STATUS_COLOR[s.status] || "light"} size="sm">
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right text-sm font-semibold text-red-600 dark:text-red-400">
                        $
                        {s.balance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <div className="flex flex-nowrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openHistoryModal(s)}
                            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                          >
                            <List className="h-4 w-4 shrink-0" />
                            Transactions
                          </button>
                          <button
                            type="button"
                            onClick={() => openPaymentModal(s)}
                            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
                          >
                            <DollarSign className="h-4 w-4 shrink-0" />
                            Payment
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              page={balancePage}
              totalPages={balanceTotalPages}
              total={balanceTotal}
              from={balanceFrom}
              to={balanceTo}
              pageSize={balancePageSize}
              onPageChange={setBalancePage}
              onPageSizeChange={setBalancePageSize}
            />
          </>
        )}
      </div>

      {/* Payment modal */}
      <Modal
        isOpen={!!paymentStudent}
        onClose={closePaymentModal}
        className="max-w-[min(100vw-2rem,440px)]"
      >
        {paymentStudent && (
          <div className="p-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Record payment
            </h3>

            <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-2 dark:border-gray-700 dark:bg-gray-800/40">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white"
                aria-hidden
              >
                {paymentInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {paymentStudent.firstName} {paymentStudent.lastName}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-mono text-violet-600 dark:text-violet-400">
                    {paymentStudent.studentId}
                  </span>
                  {" · "}
                  {paymentStudent.department?.code}
                  {paymentStudent.class ? ` · ${paymentStudent.class.name}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-medium uppercase tracking-wide text-red-600/80 dark:text-red-400/80">
                  Balance
                </p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                  $
                  {paymentStudent.balance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-800 dark:border-red-800/50 dark:bg-red-500/10 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {lastReceipt && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-500/10 dark:text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Payment saved.{" "}
                  <button
                    type="button"
                    className="font-medium underline"
                    onClick={() => openMonthlyFeeReceipt(lastReceipt)}
                  >
                    Print receipt
                  </button>
                </span>
              </div>
            )}

            <form onSubmit={handleCompletePayment} className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={modalLabelClass}>Month</label>
                  <select
                    value={paymentMonth}
                    onChange={(e) => setPaymentMonth(e.target.value)}
                    className={modalSelectClass}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => (
                      <option key={mo} value={String(mo)}>
                        {monthName(mo)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={modalLabelClass}>Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className={modalSelectClass}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <DateInput
                    id="modal-payment-date"
                    label={<span className={modalLabelClass}>Payment date</span>}
                    labelClassName="block"
                    value={paymentDate}
                    onChange={setPaymentDate}
                    inputClassName={modalInputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={modalLabelClass}>Discount</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountAmount}
                      onChange={(e) => handleDiscountChange(e.target.value)}
                      className={`${modalInputClass} pl-6`}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className={modalLabelClass}>Amount paid</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={depositAmount}
                      onChange={(e) => handleAmountPaidChange(e.target.value)}
                      className={`${modalInputClass} pl-6`}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className={modalLabelClass}>After payment</label>
                  <div className="flex h-9 items-center rounded-lg border border-amber-200/80 bg-amber-50/80 px-2.5 text-sm font-semibold text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100">
                    $
                    {balanceAfterPayment.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>

              <div
                className={
                  paymentMethod === "cash_on_hand"
                    ? "grid grid-cols-1 gap-2"
                    : "grid grid-cols-2 gap-2"
                }
              >
                <div>
                  <label className={modalLabelClass}>Payment method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    required
                    className={modalSelectClass}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                {paymentMethod === "bank_receipt" && (
                  <div>
                    <label className={modalLabelClass}>Receipt no.</label>
                    <input
                      type="text"
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      className={modalInputClass}
                      required
                      placeholder="Receipt number"
                    />
                  </div>
                )}
                {paymentMethod === "electronic" && (
                  <div>
                    <label className={modalLabelClass}>Transaction ID</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className={modalInputClass}
                      required
                      placeholder="Transaction ID"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className={modalLabelClass}>Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${modalInputClass} resize-none py-2`}
                  placeholder="Received payment details"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                <Button type="button" variant="outline" size="sm" onClick={closePaymentModal}>
                  {lastReceipt ? "Close" : "Cancel"}
                </Button>
                {!lastReceipt && (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting || !canRecord || banks.length === 0}
                    className="inline-flex items-center gap-1.5"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    {submitting ? "Saving…" : "Complete payment"}
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* History modal */}
      <Modal
        isOpen={!!historyStudent}
        onClose={closeHistoryModal}
        className="max-w-[min(100vw-2rem,720px)]"
      >
        {historyStudent && (
          <div className="p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <List className="h-5 w-5 text-brand-500" />
              Payment history
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {historyStudent.firstName} {historyStudent.lastName} ·{" "}
              <span className="font-mono">{historyStudent.studentId}</span>
            </p>

            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : historyPayments.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                No payments recorded for this student yet.
              </p>
            ) : (
              <div className="mt-4 max-h-[min(60vh,420px)] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                    <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Period</th>
                      <th className="px-3 py-2.5">Account</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyPayments.map((p) => (
                      <tr
                        key={`${p.kind}-${p.id}`}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 text-gray-700 dark:text-gray-300">
                          {new Date(p.paymentDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.kind === "monthly"
                                ? "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"
                            }`}
                          >
                            {p.kind === "monthly" ? "Monthly" : "Registration"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">
                          {paymentPeriodLabel(p)}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">
                          {p.bank ? `${p.bank.code}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-gray-800 dark:text-white/90">
                          $
                          {p.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={closeHistoryModal}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
