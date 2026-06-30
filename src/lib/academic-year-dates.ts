export function getAcademicYearDateRange(year: number): { start: Date; end: Date } {
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59, 999) };
}
