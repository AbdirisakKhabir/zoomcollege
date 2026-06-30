"use client";

import React from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import MonthlyInvoiceForm from "@/components/finance/MonthlyInvoiceForm";
import { useAuth } from "@/context/AuthContext";

export default function MonthlyInvoicePage() {
  const { hasPermission } = useAuth();
  const canRecord = hasPermission("finance.create") || hasPermission("finance.view");

  if (!hasPermission("finance.view") && !hasPermission("admission.view") && !hasPermission("dashboard.view")) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Monthly invoice" />
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-white/5">
          <p className="text-gray-500 dark:text-gray-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadCrumb pageTitle="Monthly invoice" />
      <div className="mx-auto max-w-3xl min-w-0">
        <MonthlyInvoiceForm canRecord={canRecord} />
      </div>
    </div>
  );
}
