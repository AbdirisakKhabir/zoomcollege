"use client";

import React, { useEffect, useState, useRef } from "react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authFetch } from "@/lib/api";
import { computeMonthlyInvoiceAmount } from "@/lib/monthly-fee";
import { AlertCircle, Building2, Calendar, CheckCircle2, CircleDollarSign, FileText, Loader2, Search, User, UserRound, Users, X } from "lucide-react";

type SearchStudent = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  balance: number;
  fee: number | null;
  paymentStatus: string;
  department: { name: string; code: string; registrationFee: number | null };
};

type ClassOption = {
  id: number;
  name: string;
  year: number;
  department: { code: string };
};

type MonthlyInvoiceResult = {
  year: number;
  month: number;
  chargedCount: number;
  skippedCount: number;
  charged: { studentId: string; firstName: string; lastName: string; amount: number }[];
  skipped: { studentId: string; firstName: string; lastName: string; reason: string }[];
};

const CURRENT_YEAR = new Date().getFullYear();

const inputClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:text-white/80 dark:focus:border-brand-500/40";
const selectClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:text-white/80 dark:focus:border-brand-500/40";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

type Props = { canRecord: boolean };

function monthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function MonthlyInvoiceForm({ canRecord }: Props) {
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [invMode, setInvMode] = useState<"class" | "student">("class");
  const [invClassId, setInvClassId] = useState("");
  const [invSearchQuery, setInvSearchQuery] = useState("");
  const [invSearchResults, setInvSearchResults] = useState<SearchStudent[]>([]);
  const [invSearchLoading, setInvSearchLoading] = useState(false);
  const [invSelectedStudent, setInvSelectedStudent] = useState<SearchStudent | null>(null);
  const [invYear, setInvYear] = useState(String(CURRENT_YEAR));
  const [invMonth, setInvMonth] = useState(String(new Date().getMonth() + 1));
  const [invNote, setInvNote] = useState("");
  const [invSubmitting, setInvSubmitting] = useState(false);
  const [invError, setInvError] = useState("");
  const [invResult, setInvResult] = useState<MonthlyInvoiceResult | null>(null);
  const invSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    authFetch("/api/classes").then((r) => {
      if (r.ok) {
        r.json().then((data: ClassOption[]) => {
          const list = Array.isArray(data) ? data : [];
          setClassOptions(list);
          setInvClassId((prev) => prev || (list[0] ? String(list[0].id) : ""));
        });
      }
    });
  }, []);

  useEffect(() => {
    const q = invSearchQuery.trim();
    if (q.length < 2) {
      setInvSearchResults([]);
      return;
    }
    if (invSearchDebounceRef.current) clearTimeout(invSearchDebounceRef.current);
    invSearchDebounceRef.current = setTimeout(async () => {
      setInvSearchLoading(true);
      try {
        const res = await authFetch(`/api/students/search?q=${encodeURIComponent(q)}&limit=15`);
        if (res.ok) setInvSearchResults(await res.json());
        else setInvSearchResults([]);
      } catch {
        setInvSearchResults([]);
      }
      setInvSearchLoading(false);
    }, 300);
    return () => {
      if (invSearchDebounceRef.current) clearTimeout(invSearchDebounceRef.current);
    };
  }, [invSearchQuery]);

  const previewMonthlyAmount = invSelectedStudent
    ? computeMonthlyInvoiceAmount(invSelectedStudent.fee, invSelectedStudent.paymentStatus)
    : null;

  const handleSelectInvStudent = (s: SearchStudent) => {
    setInvSelectedStudent(s);
    setInvSearchResults([]);
    setInvSearchQuery(`${s.firstName} ${s.lastName} (${s.studentId})`);
  };

  const handleClearInvStudent = () => {
    setInvSelectedStudent(null);
    setInvSearchQuery("");
  };

  const handleMonthlyInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvError("");
    setInvResult(null);
    const y = Number(invYear);
    const m = Number(invMonth);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      setInvError("Choose a valid year and month.");
      return;
    }
    if (invMode === "class" && !invClassId) {
      setInvError("Select a class.");
      return;
    }
    if (invMode === "student" && !invSelectedStudent) {
      setInvError("Select a student.");
      return;
    }
    setInvSubmitting(true);
    try {
      const res = await authFetch("/api/finance/monthly-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: invMode,
          classId: invMode === "class" ? Number(invClassId) : undefined,
          studentStudentId: invMode === "student" ? invSelectedStudent?.studentId : undefined,
          year: y,
          month: m,
          note: invNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInvError(data.error || "Invoice failed");
        return;
      }
      setInvResult(data as MonthlyInvoiceResult);
      if (invMode === "student") handleClearInvStudent();
      setInvNote("");
    } catch {
      setInvError("Network error");
    } finally {
      setInvSubmitting(false);
    }
  };

  const totalCharged = invResult?.charged.reduce((sum, row) => sum + row.amount, 0) ?? 0;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
          <FileText className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Monthly Invoice</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Post monthly fees to student balances</p>
        </div>
      </div>

      <form onSubmit={handleMonthlyInvoice} className="p-5 sm:p-6">
        {invError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span>{invError}</span>
          </div>
        )}

        {invResult && (
          <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <CheckCircle2 className="h-5 w-5 text-success-600 dark:text-success-400" strokeWidth={1.8} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 dark:text-white/90">
                  {monthLabel(invResult.month, invResult.year)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {invResult.chargedCount} invoiced
                  {invResult.skippedCount > 0 ? ` · ${invResult.skippedCount} skipped` : ""}
                  {totalCharged > 0 ? ` · $${totalCharged.toLocaleString()} total` : ""}
                </p>
              </div>
              <Badge color="success" size="sm">
                Complete
              </Badge>
            </div>

            {invResult.charged.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-transparent! hover:bg-transparent!">
                      <TableCell isHeader>Student</TableCell>
                      <TableCell isHeader>ID</TableCell>
                      <TableCell isHeader className="text-right">Amount</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invResult.charged.map((c) => (
                      <TableRow key={c.studentId}>
                        <TableCell>
                          {c.firstName} {c.lastName}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{c.studentId}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${c.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {invResult.skipped.length > 0 && (
              <details className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">
                  Skipped students ({invResult.skipped.length})
                </summary>
                <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {invResult.skipped.map((s, idx) => (
                    <li key={`${s.studentId}-${idx}`}>
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {s.firstName} {s.lastName}
                      </span>{" "}
                      <span className="font-mono text-xs">({s.studentId})</span>
                      <span className="text-gray-500"> — {s.reason}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <p className={labelClass}>Apply to</p>
            <div className="inline-flex rounded-lg border border-gray-200 p-1 dark:border-gray-700">
              {[
                { value: "class" as const, label: "Whole class", icon: Users },
                { value: "student" as const, label: "One student", icon: UserRound },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = invMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setInvMode(opt.value);
                      setInvError("");
                      setInvResult(null);
                    }}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-brand-500 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {invMode === "class" ? (
            <div>
              <label htmlFor="inv-class" className={labelClass}>
                Class
              </label>
              <select
                id="inv-class"
                value={invClassId}
                onChange={(e) => setInvClassId(e.target.value)}
                required
                className={selectClass}
              >
                <option value="">Select class</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.department.code} — {c.name} ({c.year})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="relative space-y-3">
              <div>
                <label htmlFor="inv-student" className={`${labelClass} flex items-center gap-1.5`}>
                  <UserRound className="h-4 w-4 text-brand-500" strokeWidth={1.8} />
                  Student
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    strokeWidth={1.8}
                  />
                  <input
                    id="inv-student"
                    type="text"
                    value={invSearchQuery}
                    onChange={(e) => {
                      setInvSearchQuery(e.target.value);
                      if (!e.target.value) setInvSelectedStudent(null);
                    }}
                    placeholder="Search by name, phone, or student ID"
                    className={`${inputClass} pl-9 pr-10`}
                  />
                  {invSearchLoading && (
                    <Loader2
                      className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-500"
                      strokeWidth={1.8}
                    />
                  )}
                  {invSelectedStudent && !invSearchLoading && (
                    <button
                      type="button"
                      onClick={handleClearInvStudent}
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
                      aria-label="Clear student"
                    >
                      <X className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </div>

              {invSearchResults.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {invSearchResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectInvStudent(s)}
                      className="flex w-full items-start gap-3 border-b border-gray-100 px-3 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5 last:border-0"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                        <User className="h-4 w-4" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-mono">{s.studentId}</span>
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" strokeWidth={1.8} />
                            {s.department.code}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CircleDollarSign className="h-3 w-3" strokeWidth={1.8} />
                            ${(s.balance ?? 0).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {invSelectedStudent && (
                <div className="rounded-lg border border-brand-200 bg-brand-50/50 px-4 py-3 dark:border-brand-800/50 dark:bg-brand-500/10">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                      <UserRound className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 dark:text-white/90">
                        {invSelectedStudent.firstName} {invSelectedStudent.lastName}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <User className="h-3.5 w-3.5" strokeWidth={1.8} />
                          {invSelectedStudent.studentId}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                          {invSelectedStudent.department.name}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CircleDollarSign className="h-3.5 w-3.5" strokeWidth={1.8} />
                          Balance ${(invSelectedStudent.balance ?? 0).toLocaleString()}
                        </span>
                      </p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                        <CircleDollarSign className="h-4 w-4 text-brand-500" strokeWidth={1.8} />
                        Invoice amount:{" "}
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${(previewMonthlyAmount ?? 0).toLocaleString()}
                        </span>
                        {previewMonthlyAmount === 0 && (
                          <span className="text-amber-600 dark:text-amber-400">(no charge)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="inv-month" className={`${labelClass} flex items-center gap-1.5`}>
                <Calendar className="h-4 w-4 text-gray-400" strokeWidth={1.8} />
                Month
              </label>
              <select
                id="inv-month"
                value={invMonth}
                onChange={(e) => setInvMonth(e.target.value)}
                className={selectClass}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => (
                  <option key={mo} value={String(mo)}>
                    {new Date(2000, mo - 1, 1).toLocaleString("en-US", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="inv-year" className={labelClass}>
                Year
              </label>
              <input
                id="inv-year"
                type="number"
                value={invYear}
                onChange={(e) => setInvYear(e.target.value)}
                className={inputClass}
                min={2000}
                max={2100}
              />
            </div>
          </div>

          <div>
            <label htmlFor="inv-note" className={labelClass}>
              Note <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="inv-note"
              type="text"
              value={invNote}
              onChange={(e) => setInvNote(e.target.value)}
              placeholder="Internal note for this batch"
              className={inputClass}
            />
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-5 dark:border-gray-800">
            <Button
              type="submit"
              disabled={
                invSubmitting ||
                !canRecord ||
                (invMode === "class" && !invClassId) ||
                (invMode === "student" && !invSelectedStudent)
              }
              size="sm"
            >
              {invSubmitting ? "Posting…" : "Post monthly invoice"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
