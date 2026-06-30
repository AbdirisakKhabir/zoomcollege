"use client";

import React, { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/button/Button";
import { DateInput } from "@/components/form/DateInput";
import { authFetch } from "@/lib/api";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  GraduationCap,
  Loader2,
  Search,
  User,
  UserRound,
  X,
} from "lucide-react";

type Bank = { id: number; name: string; code: string };
type SearchStudent = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  balance: number;
  department: { name: string; code: string; registrationFee: number | null };
  tuitionPayments: { id: number; amount: number }[];
};

const inputClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:text-white/80 dark:focus:border-brand-500/40";
const selectClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15 dark:border-gray-700 dark:text-white/80 dark:focus:border-brand-500/40";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

type Props = {
  canRecord: boolean;
  banks: Bank[];
  onBanksRefresh?: () => void;
};

export default function TuitionPaymentForm({ canRecord, banks, onBanksRefresh }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchStudent[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<SearchStudent | null>(null);
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasPaidRegistration = (selectedStudent?.tuitionPayments?.length ?? 0) > 0;

  useEffect(() => {
    if (banks.length > 0 && !bankId) {
      setBankId(String(banks[0].id));
    }
  }, [banks, bankId]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await authFetch(`/api/students/search?q=${encodeURIComponent(q)}&limit=15`);
        if (res.ok) setSearchResults(await res.json());
        else setSearchResults([]);
      } catch {
        setSearchResults([]);
      }
      setSearchLoading(false);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const handleSelectStudent = (s: SearchStudent) => {
    setSelectedStudent(s);
    setSearchResults([]);
    setSearchQuery(`${s.firstName} ${s.lastName} (${s.studentId})`);
    if (!amount.trim()) {
      const defaultAmount =
        s.balance > 0 ? s.balance : (s.department.registrationFee ?? 0);
      setAmount(String(defaultAmount));
    }
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setSearchQuery("");
    setAmount("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedStudent) {
      setError("Select a student.");
      return;
    }
    if (hasPaidRegistration) {
      setError("Registration fee has already been collected for this student.");
      return;
    }
    if (!bankId) {
      setError("Select a payment method.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch("/api/tuition-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.studentId,
          amount: amt,
          bankId: Number(bankId),
          paymentMethod: "bank_receipt",
          paymentDate: paymentDate || undefined,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not record registration fee payment");
        return;
      }
      setSuccess(
        `Registration fee collected for ${selectedStudent.firstName} ${selectedStudent.lastName}.`
      );
      handleClearStudent();
      setNote("");
      onBanksRefresh?.();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
          <GraduationCap className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Collect registration fee</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            One-time department registration fee charged when the student is admitted
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-800 dark:border-success-800 dark:bg-success-500/10 dark:text-success-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span>{success}</span>
          </div>
        )}

        <div className="relative space-y-3">
          <div>
            <label htmlFor="registration-student" className={`${labelClass} flex items-center gap-1.5`}>
              <UserRound className="h-4 w-4 text-brand-500" strokeWidth={1.8} />
              Student
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                strokeWidth={1.8}
              />
              <input
                id="registration-student"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) setSelectedStudent(null);
                }}
                placeholder="Search by name, phone, or student ID"
                className={`${inputClass} pl-9 pr-10`}
              />
              {searchLoading && (
                <Loader2
                  className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-500"
                  strokeWidth={1.8}
                />
              )}
              {selectedStudent && !searchLoading && (
                <button
                  type="button"
                  onClick={handleClearStudent}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10"
                  aria-label="Clear student"
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              )}
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {searchResults.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectStudent(s)}
                  className="flex w-full items-start gap-3 border-b border-gray-100 px-3 py-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5 last:border-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15">
                    <User className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-mono">{s.studentId}</span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" strokeWidth={1.8} />
                        {s.department.code}
                      </span>
                      {s.tuitionPayments.length > 0 ? (
                        <span className="text-success-600 dark:text-success-400">Registration paid</span>
                      ) : (
                        <span>Balance: ${s.balance.toLocaleString()}</span>
                      )}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedStudent && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-white/5">
            {hasPaidRegistration ? (
              <p className="text-amber-700 dark:text-amber-300">
                Registration fee has already been collected for this student.
              </p>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                Outstanding balance:{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${selectedStudent.balance.toLocaleString()}
                </span>
                {selectedStudent.department.registrationFee != null && (
                  <>
                    {" "}
                    · Dept registration fee: $
                    {selectedStudent.department.registrationFee.toLocaleString()}
                  </>
                )}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="registration-amount" className={`${labelClass} flex items-center gap-1.5`}>
            <CircleDollarSign className="h-4 w-4 text-gray-400" strokeWidth={1.8} />
            Amount
          </label>
          <input
            id="registration-amount"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
            required
            disabled={hasPaidRegistration}
          />
        </div>

        <div>
          <label htmlFor="registration-bank" className={labelClass}>
            Payment method
          </label>
          <select
            id="registration-bank"
            value={bankId}
            onChange={(e) => setBankId(e.target.value)}
            className={selectClass}
            required
            disabled={hasPaidRegistration}
          >
            {banks.length === 0 ? (
              <option value="">No accounts configured</option>
            ) : (
              banks.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.code} — {b.name}
                </option>
              ))
            )}
          </select>
        </div>

        <DateInput
          id="registration-date"
          label="Payment date"
          labelClassName={labelClass}
          value={paymentDate}
          onChange={setPaymentDate}
          inputClassName={inputClass}
        />

        <div>
          <label htmlFor="registration-note" className={labelClass}>
            Note <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="registration-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
            disabled={hasPaidRegistration}
          />
        </div>

        <div className="flex justify-end border-t border-gray-100 pt-5 dark:border-gray-800">
          <Button
            type="submit"
            disabled={submitting || !canRecord || banks.length === 0 || hasPaidRegistration}
            size="sm"
          >
            {submitting ? "Saving…" : "Collect registration fee"}
          </Button>
        </div>
      </form>
    </div>
  );
}
