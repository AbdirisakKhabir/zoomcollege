"use client";

import { useCallback, useState } from "react";
import {
  defaultReportDateRange,
  type ReportDateRangePreset,
} from "@/lib/report-date-range";

export function useReportDateRange(preset: ReportDateRangePreset = "year") {
  const defaults = defaultReportDateRange(preset);
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);

  const setDateFromSafe = useCallback((value: string) => {
    setDateFrom(value);
    setDateTo((current) => (current && value && value > current ? value : current));
  }, []);

  const setDateToSafe = useCallback((value: string) => {
    setDateTo(value);
  }, []);

  return {
    dateFrom,
    dateTo,
    setDateFrom: setDateFromSafe,
    setDateTo: setDateToSafe,
  };
}
