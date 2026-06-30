import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { DollarLineIcon, ListIcon } from "@/icons";

import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Finance Reports"),
  description: "Finance, payment, and account reports",
};

const paymentReportLinks = [
  { name: "Student Transactions", path: "/reports/student-transactions", icon: ListIcon, description: "View student payment status by department and class" },
  { name: "Outstanding Balances", path: "/reports/outstanding-balances", icon: DollarLineIcon, description: "Students with outstanding balance by department, class, and date" },
  { name: "Registration Fee Report", path: "/reports/registration-fee", icon: DollarLineIcon, description: "One-time registration fees — paid and unpaid students by department and class" },
  { name: "Paid Students", path: "/reports/paid-students", icon: DollarLineIcon, description: "Students who paid monthly fees in a selected date range with totals" },
  { name: "Scholarship Report", path: "/reports/scholarship", icon: DollarLineIcon, description: "View students on full or half scholarship" },
  { name: "Individual Student Report", path: "/reports/individual-student", icon: ListIcon, description: "Payment history and balance for one student" },
  { name: "Revenue Summary", path: "/reports/revenue-summary", icon: DollarLineIcon, description: "Target revenue vs collected amount per class" },
  { name: "Unpaid Students", path: "/reports/unpaid-students", icon: DollarLineIcon, description: "Students who have not paid their one-time registration fee" },
  { name: "Account Balances", path: "/reports/bank-balances", icon: DollarLineIcon, description: "Current balance of each financial account" },
  { name: "Account Transactions", path: "/reports/bank-transactions", icon: ListIcon, description: "Deposits, withdrawals, and transfers by account and date" },
  { name: "Transaction History", path: "/reports/transaction-history", icon: ListIcon, description: "Unified log of all financial transactions (auto-created)" },
  { name: "Daily Report", path: "/reports/daily-revenue", icon: DollarLineIcon, description: "Registration and monthly fee revenue by day and by class in a date range" },
  { name: "Income Statement", path: "/reports/income-statement", icon: DollarLineIcon, description: "Revenue, expenses, and net income for a selected date range" },
];

export default function PaymentReportsIndexPage() {
  return (
    <div>
      <PageBreadCrumb pageTitle="Finance Reports" />
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Select a finance report to view, export, and print.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paymentReportLinks.map((report) => (
          <Link key={report.path} href={report.path}>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-brand-200 hover:shadow-md dark:border-gray-800 dark:bg-white/5 dark:hover:border-brand-500/30">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                <report.icon className="size-6 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">{report.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
              <p className="mt-3 text-sm font-medium text-brand-600 dark:text-brand-400">View Report →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
