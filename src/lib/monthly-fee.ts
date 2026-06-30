/** One-time registration fee from department, adjusted by scholarship status. */
export function computeRegistrationFeeAmount(
  registrationFee: number | null | undefined,
  paymentStatus: string
): number {
  const base = registrationFee ?? 0;
  if (paymentStatus === "Full Scholarship") return 0;
  if (paymentStatus === "Half Scholar") return base * 0.5;
  return base;
}

/** Monthly invoice line amount from student fee, adjusted by scholarship. */
export function computeMonthlyInvoiceAmount(
  studentFee: number | null | undefined,
  paymentStatus: string
): number {
  const base = studentFee ?? 0;
  if (paymentStatus === "Full Scholarship") return 0;
  if (paymentStatus === "Half Scholar") return base * 0.5;
  return base;
}
