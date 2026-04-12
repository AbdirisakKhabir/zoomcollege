/** Monthly invoice line amount from student fee override or department tuition, adjusted by scholarship. */
export function computeMonthlyInvoiceAmount(
  studentFee: number | null | undefined,
  departmentTuition: number | null | undefined,
  paymentStatus: string
): number {
  const base = studentFee ?? departmentTuition ?? 0;
  if (paymentStatus === "Full Scholarship") return 0;
  if (paymentStatus === "Half Scholar") return base * 0.5;
  return base;
}
