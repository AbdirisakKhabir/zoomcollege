"use client";

import React from "react";

type ReportFilterSectionProps = {
  children: React.ReactNode;
  title?: string;
  headerRight?: React.ReactNode;
  hint?: React.ReactNode;
};

export default function ReportFilterSection({
  children,
  title = "Filters",
  headerRight,
  hint,
}: ReportFilterSectionProps) {
  return (
    <div className="no-print border-b border-gray-100 px-5 py-4 dark:border-gray-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h3>
        {headerRight}
      </div>
      <div className="flex flex-wrap gap-4">{children}</div>
      {hint && <div className="mt-2">{hint}</div>}
    </div>
  );
}
