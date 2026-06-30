"use client";

import React from "react";

type ReportCardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function ReportCard({ children, className = "" }: ReportCardProps) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/5 ${className}`}
    >
      {children}
    </div>
  );
}
