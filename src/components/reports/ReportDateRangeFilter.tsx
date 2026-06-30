"use client";

import React from "react";
import ReportFilterField, { ReportFilterInput } from "@/components/reports/ReportFilterField";

type Props = {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  startLabel?: string;
  endLabel?: string;
  allowEmptyStart?: boolean;
};

export default function ReportDateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  startLabel = "Start date",
  endLabel = "End date",
  allowEmptyStart = false,
}: Props) {
  const handleStartChange = (value: string) => {
    onDateFromChange(value);
    if (value && dateTo && value > dateTo) {
      onDateToChange(value);
    }
  };

  return (
    <>
      <ReportFilterField label={startLabel}>
        <ReportFilterInput
          type="date"
          value={dateFrom}
          onChange={(e) => handleStartChange(e.target.value)}
          aria-label={startLabel}
          required={!allowEmptyStart}
        />
      </ReportFilterField>
      <ReportFilterField label={endLabel}>
        <ReportFilterInput
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          min={dateFrom || undefined}
          aria-label={endLabel}
          required
        />
      </ReportFilterField>
    </>
  );
}
