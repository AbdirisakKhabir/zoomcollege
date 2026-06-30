"use client";

import React from "react";
import { REPORT_INPUT_CLASS, REPORT_SELECT_CLASS } from "@/lib/report-utils";

type ReportFilterFieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

export default function ReportFilterField({
  label,
  children,
  className = "",
}: ReportFilterFieldProps) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </label>
      {children}
    </div>
  );
}

export function ReportFilterSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { minWidth?: string }
) {
  const { className = "", minWidth, style, ...rest } = props;
  return (
    <select
      className={`${REPORT_SELECT_CLASS} ${className}`}
      style={minWidth ? { ...style, minWidth } : style}
      {...rest}
    />
  );
}

export function ReportFilterInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  const { className = "", ...rest } = props;
  return <input className={`${REPORT_INPUT_CLASS} ${className}`} {...rest} />;
}
