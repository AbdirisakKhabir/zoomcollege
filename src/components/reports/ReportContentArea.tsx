"use client";

import React from "react";
import ReportPrintHeader, { type ReportPrintMetaItem } from "./ReportPrintHeader";

type ReportContentAreaProps = {
  title: string;
  printMeta?: ReportPrintMetaItem[];
  summary?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function ReportContentArea({
  title,
  printMeta,
  summary,
  children,
  className = "",
}: ReportContentAreaProps) {
  return (
    <div className={`report-content-area px-5 py-5 sm:px-6 ${className}`}>
      <ReportPrintHeader title={title} meta={printMeta} />
      {summary}
      {children}
    </div>
  );
}
