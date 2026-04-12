"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import MonthlyFeeCollectionForm from "@/components/finance/MonthlyFeeCollectionForm";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Bank = { id: number; name: string; code: string; balance: number; accountNumber?: string | null };

export default function CollectMonthlyFeePage() {
  const { hasPermission } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);

  const canRecord = hasPermission("finance.create") || hasPermission("finance.view");

  useEffect(() => {
    authFetch("/api/banks").then((r) => {
      if (r.ok) r.json().then((d: Bank[]) => setBanks(d));
    });
  }, []);

  if (!hasPermission("finance.view") && !hasPermission("admission.view") && !hasPermission("dashboard.view")) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Collect monthly fee" />
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-white/5">
          <p className="text-gray-500 dark:text-gray-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadCrumb pageTitle="Collect monthly fee" />
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/finance" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          ← Finance home
        </Link>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <Link href="/finance/payments" className="text-gray-600 hover:text-brand-600 dark:text-gray-400">
          Payment history
        </Link>
      </div>
      <div className="mx-auto max-w-3xl min-w-0">
        <MonthlyFeeCollectionForm
          canRecord={canRecord}
          banks={banks}
          onBanksRefresh={() => {
            authFetch("/api/banks").then((r) => {
              if (r.ok) r.json().then((d: Bank[]) => setBanks(d));
            });
          }}
        />
      </div>
    </div>
  );
}
