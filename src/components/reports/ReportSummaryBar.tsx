"use client";

import React from "react";

type ReportSummaryBarProps = {
  children: React.ReactNode;
  className?: string;
};

export default function ReportSummaryBar({ children, className = "" }: ReportSummaryBarProps) {
  return (
    <div
      className={`no-print mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm dark:border-gray-800 dark:bg-white/3 ${className}`}
    >
      {children}
    </div>
  );
}

export function ReportSummaryItem({
  label,
  value,
  className = "",
}: {
  label?: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`text-gray-600 dark:text-gray-400 ${className}`}>
      {label && (
        <>
          <strong className="text-gray-800 dark:text-white/80">{value}</strong>{" "}
          {label}
        </>
      )}
      {!label && value}
    </span>
  );
}
