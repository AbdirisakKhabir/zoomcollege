"use client";

import React from "react";
import Link from "next/link";

type DashboardCardProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  headerExtra?: React.ReactNode;
};

export default function DashboardCard({
  title,
  subtitle,
  icon,
  iconClassName = "bg-brand-500/15 text-brand-600 dark:bg-brand-500/25 dark:text-brand-400",
  actionHref,
  actionLabel = "View all",
  children,
  className = "",
  loading = false,
  headerExtra,
}: DashboardCardProps) {
  if (loading) {
    return (
      <div
        className={`overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
      >
        <div className="border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div className="space-y-2">
              <div className="h-5 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800/80" />
            </div>
          </div>
        </div>
        <div className="px-5 py-6 sm:px-6">
          <div className="h-[260px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/60" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group/card overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:shadow-none dark:hover:ring-1 dark:hover:ring-gray-800 ${className}`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerExtra}
          {actionHref && (
            <Link
              href={actionHref}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:text-brand-400 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
            >
              {actionLabel}
            </Link>
          )}
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </div>
  );
}
