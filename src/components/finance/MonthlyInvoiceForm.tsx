"use client";

import React, { useEffect, useState, useRef } from "react";
import Button from "@/components/ui/button/Button";
import { authFetch } from "@/lib/api";
import { computeMonthlyInvoiceAmount } from "@/lib/monthly-fee";
import { UserCircleIcon, CalenderIcon, AlertIcon } from "@/icons";

type SearchStudent = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  balance: number;
  fee: number | null;
  paymentStatus: string;
  department: { name: string; code: string; tuitionFee: number | null };
};

type ClassOption = {
  id: number;
  name: string;
  semester: string;
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

type Props = { canRecord: boolean };

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
    ? computeMonthlyInvoiceAmount(
        invSelectedStudent.fee,
        invSelectedStudent.department?.tuitionFee,
        invSelectedStudent.paymentStatus
      )
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

  const inputClass =
    "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition-all placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-600 dark:bg-gray-900/80 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20";
  const selectClass =
    "h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-600 dark:bg-gray-900/80 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-500/20";

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <CalenderIcon className="h-5 w-5 shrink-0 text-brand-500" />
          Monthly invoice
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Post each student&apos;s monthly fee to their balance for the month you select. Students who already have an
          invoice for that month are skipped. Amount uses the student&apos;s Fee if set, otherwise the department
          tuition, with scholarship rules applied.
        </p>
      </div>

      <form onSubmit={handleMonthlyInvoice} className="p-5 sm:p-6">
        <div className="space-y-6">
          {invError && (
            <div
              role="alert"
              className="flex gap-3 rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3.5 text-sm text-red-800 dark:border-red-800/50 dark:bg-red-500/10 dark:text-red-300"
            >
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
              <span>{invError}</span>
            </div>
          )}

          {invResult && (
            <div className="space-y-3 rounded-2xl border border-emerald-200/80 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-500/10 dark:text-emerald-200">
              <p className="font-semibold">
                Invoiced {invResult.chargedCount} student(s) for{" "}
                {new Date(invResult.year, invResult.month - 1, 1).toLocaleString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
                {invResult.skippedCount > 0 ? ` · ${invResult.skippedCount} skipped` : ""}
                .
              </p>
              {invResult.charged.length > 0 && (
                <ul className="max-h-40 list-inside list-disc overflow-auto text-emerald-900/90 dark:text-emerald-200/90">
                  {invResult.charged.map((c) => (
                    <li key={c.studentId}>
                      {c.firstName} {c.lastName} ({c.studentId}) — ${c.amount.toLocaleString()}
                    </li>
                  ))}
                </ul>
              )}
              {invResult.skipped.length > 0 && (
                <details className="text-emerald-900/85 dark:text-emerald-200/85">
                  <summary className="cursor-pointer font-medium">Skipped ({invResult.skipped.length})</summary>
                  <ul className="mt-2 max-h-36 list-inside list-disc overflow-auto">
                    {invResult.skipped.map((s, idx) => (
                      <li key={`${s.studentId}-${idx}`}>
                        {s.firstName} {s.lastName} ({s.studentId}): {s.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
            <p className="mb-3 text-sm font-medium text-gray-800 dark:text-white/90">Apply to</p>
            <div className="flex flex-wrap gap-3">
              {[
                { value: "class" as const, label: "Whole class" },
                { value: "student" as const, label: "One student" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-3 transition-all ${
                    invMode === opt.value
                      ? "border-brand-500 bg-white shadow-sm ring-1 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-500/15"
                      : "border-gray-200 bg-white/60 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="invMode"
                    checked={invMode === opt.value}
                    onChange={() => {
                      setInvMode(opt.value);
                      setInvError("");
                      setInvResult(null);
                    }}
                    className="sr-only"
                  />
                  <span className="font-medium text-gray-800 dark:text-white/90">{opt.label}</span>
                </label>
              ))}
            </div>

            {invMode === "class" ? (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Class</label>
                <select
                  value={invClassId}
                  onChange={(e) => setInvClassId(e.target.value)}
                  required
                  className={selectClass}
                >
                  <option value="">Choose a class…</option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.department.code} — {c.name} ({c.semester} {c.year})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="relative mt-4">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <UserCircleIcon className="h-4 w-4 text-brand-500" />
                  Student <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={invSearchQuery}
                  onChange={(e) => {
                    setInvSearchQuery(e.target.value);
                    if (!e.target.value) setInvSelectedStudent(null);
                  }}
                  placeholder="Search by name, phone, or student ID"
                  className={`${inputClass} pr-12`}
                />
                {invSearchLoading && (
                  <div className="absolute right-4 top-10 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
                )}
                {invSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                    {invSearchResults.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectInvStudent(s)}
                        className="flex w-full flex-col gap-0.5 border-b border-gray-100 px-4 py-3.5 text-left transition-colors hover:bg-brand-50 dark:border-gray-800 dark:hover:bg-brand-500/10 last:border-0"
                      >
                        <span className="font-medium text-gray-800 dark:text-white/90">
                          {s.firstName} {s.lastName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {s.studentId} · Balance ${(s.balance ?? 0).toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {invSelectedStudent && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    Monthly line amount for this student:{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${(previewMonthlyAmount ?? 0).toLocaleString()}
                    </span>
                    {previewMonthlyAmount === 0 && (
                      <span className="ml-2 text-amber-700 dark:text-amber-300">
                        (no charge — scholarship or missing fee)
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Month</label>
              <select value={invMonth} onChange={(e) => setInvMonth(e.target.value)} className={selectClass}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => (
                  <option key={mo} value={String(mo)}>
                    {new Date(2000, mo - 1, 1).toLocaleString("en-US", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
              <input
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
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Note (optional)</label>
            <input
              type="text"
              value={invNote}
              onChange={(e) => setInvNote(e.target.value)}
              placeholder="e.g. January tuition batch"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-4 border-t border-gray-100 pt-6 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This increases outstanding balance. It does not record a bank deposit.
            </p>
            <Button
              type="submit"
              disabled={
                invSubmitting ||
                !canRecord ||
                (invMode === "class" && !invClassId) ||
                (invMode === "student" && !invSelectedStudent)
              }
              variant="outline"
              className="min-w-[200px] rounded-xl border-brand-300 bg-brand-50 px-6 py-2.5 text-base font-semibold text-brand-800 hover:bg-brand-100 dark:border-brand-600 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25"
            >
              {invSubmitting ? "Posting…" : "Send monthly invoice"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
