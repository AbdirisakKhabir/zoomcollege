export type ReportDateRangePreset = "year" | "month" | "empty-to-today";

export function reportToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function reportYearStart(year = new Date().getFullYear()): string {
  return `${year}-01-01`;
}

export function reportYearEnd(year = new Date().getFullYear()): string {
  return `${year}-12-31`;
}

export function reportMonthStart(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function defaultReportDateRange(preset: ReportDateRangePreset = "year"): {
  dateFrom: string;
  dateTo: string;
} {
  switch (preset) {
    case "month":
      return { dateFrom: reportMonthStart(), dateTo: reportToday() };
    case "empty-to-today":
      return { dateFrom: "", dateTo: reportToday() };
    case "year":
    default:
      return { dateFrom: reportYearStart(), dateTo: reportYearEnd() };
  }
}

export function formatReportDateLabel(value: string): string {
  if (!value) return "";
  return new Date(`${value}T12:00:00.000Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatReportDateRange(dateFrom: string, dateTo: string): string {
  if (dateFrom && dateTo) {
    return `${formatReportDateLabel(dateFrom)} – ${formatReportDateLabel(dateTo)}`;
  }
  if (dateFrom) return `From ${formatReportDateLabel(dateFrom)}`;
  if (dateTo) return `Until ${formatReportDateLabel(dateTo)}`;
  return "All dates";
}

export function monthsInRange(dateFrom: string, dateTo: string): number {
  const start = new Date(`${dateFrom}T00:00:00.000Z`);
  const end = new Date(`${dateTo}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return 1;
  }
  const y1 = start.getUTCFullYear();
  const m1 = start.getUTCMonth();
  const y2 = end.getUTCFullYear();
  const m2 = end.getUTCMonth();
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}

export function parseReportDateParam(value: string | null, endOfDay = false): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(`${value.trim()}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseReportDateRangeFromSearchParams(
  searchParams: URLSearchParams,
  fallback = defaultReportDateRange("year")
): { dateFrom: string; dateTo: string; start: Date; end: Date } | { error: string } {
  const dateFrom = searchParams.get("dateFrom")?.trim() || fallback.dateFrom;
  const dateTo = searchParams.get("dateTo")?.trim() || fallback.dateTo;

  if (!dateFrom || !dateTo) {
    return { error: "Start date and end date are required" };
  }

  const start = parseReportDateParam(dateFrom);
  const end = parseReportDateParam(dateTo, true);

  if (!start || !end) {
    return { error: "Invalid start or end date" };
  }
  if (start > end) {
    return { error: "Start date must be on or before end date" };
  }

  return { dateFrom, dateTo, start, end };
}
