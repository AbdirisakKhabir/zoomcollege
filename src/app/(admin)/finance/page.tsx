"use client";

import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/context/AuthContext";
import { DollarLineIcon, CalenderIcon, PieChartIcon } from "@/icons";

const cards = [
  {
    title: "Collect monthly fee",
    description: "Calendar-month payments, multiple months, bank deposit, printable receipt.",
    href: "/finance/collect-monthly-fee",
    icon: DollarLineIcon,
    accent: "from-violet-600 to-indigo-700",
  },
  {
    title: "Monthly invoice",
    description: "Post monthly fees to student balances for a selected month (class or one student).",
    href: "/finance/monthly-invoice",
    icon: CalenderIcon,
    accent: "from-emerald-600 to-teal-700",
  },
  {
    title: "Payment history",
    description: "Browse and filter recorded tuition and deposits.",
    href: "/finance/payments",
    icon: PieChartIcon,
    accent: "from-slate-600 to-slate-800",
  },
] as const;

export default function FinancePage() {
  const { hasPermission } = useAuth();

  if (!hasPermission("finance.view") && !hasPermission("admission.view") && !hasPermission("dashboard.view")) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Finance" />
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-white/5">
          <p className="text-gray-500 dark:text-gray-400">You do not have permission to view Finance.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadCrumb pageTitle="Finance" />

      <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
        Choose a task below. Monthly fee tools use calendar months.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-brand-300 hover:shadow-md dark:border-gray-800 dark:bg-white/3 dark:hover:border-brand-600/50"
            >
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.accent} text-white shadow-lg`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                {c.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{c.description}</p>
              <span className="mt-4 inline-flex items-center text-sm font-medium text-brand-600 dark:text-brand-400">
                Open
                <span className="ml-1 transition-transform group-hover:translate-x-0.5" aria-hidden>
                  →
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-200 pt-8 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <Link href="/finance/banks" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Banks
        </Link>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <Link href="/finance/expenses" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Expenses
        </Link>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <Link href="/reports/payment" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Finance reports
        </Link>
      </div>
    </div>
  );
}
