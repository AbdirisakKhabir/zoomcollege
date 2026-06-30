"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import TuitionPaymentForm from "@/components/finance/TuitionPaymentForm";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Bank = { id: number; name: string; code: string; balance: number };

export default function TuitionPaymentPage() {
  const { hasPermission } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);

  const canRecord = hasPermission("finance.create") || hasPermission("finance.view");

  const loadBanks = () => {
    authFetch("/api/banks").then((r) => {
      if (r.ok) r.json().then((d: Bank[]) => setBanks(d));
    });
  };

  useEffect(() => {
    loadBanks();
  }, []);

  if (!hasPermission("finance.view") && !hasPermission("admission.view") && !hasPermission("dashboard.view")) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Collect registration fee" />
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-white/5">
          <p className="text-gray-500 dark:text-gray-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadCrumb pageTitle="Collect registration fee" />
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
        <Link href="/finance/collect-monthly-fee" className="hover:text-brand-600 dark:hover:text-brand-400">
          Collect monthly fee
        </Link>
        <span>·</span>
        <Link href="/finance/payments" className="hover:text-brand-600 dark:hover:text-brand-400">
          Payment history
        </Link>
      </div>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        When a student is registered, their department registration fee is charged to their balance automatically.
        Use this page to record when the fee is collected.
      </p>
      <div className="mx-auto max-w-2xl min-w-0">
        <TuitionPaymentForm canRecord={canRecord} banks={banks} onBanksRefresh={loadBanks} />
      </div>
    </div>
  );
}
