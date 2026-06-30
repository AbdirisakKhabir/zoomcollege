"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { BRAND } from "@/lib/brand";
import { authFetch } from "@/lib/api";
import {
  Building2,
  Calendar,
  ChevronLeft,
  CircleDollarSign,
  GraduationCap,
  LucideIcon,
  Mail,
  MapPin,
  Phone,
  User,
  UserCircle,
  Users,
} from "lucide-react";

type PaymentBank = { code: string; name: string } | null;

type TuitionPaymentRow = {
  id: number;
  year: number;
  amount: number;
  paidAt: string;
  paymentDate: string;
  paymentMethod: string;
  bank: PaymentBank;
};

type MonthlyPaymentRow = {
  id: number;
  year: number;
  month: number;
  amount: number;
  paidAt: string;
  paymentDate: string;
  paymentMethod: string;
  bank: PaymentBank;
};

type StudentProfile = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  motherName: string | null;
  parentPhone: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  imageUrl: string | null;
  department: { id: number; name: string; code: string; registrationFee: number | null };
  class: { id: number; name: string; department: { code: string; name: string } } | null;
  program: string | null;
  status: string;
  paymentStatus: string;
  fee: number | null;
  balance: number;
  admissionDate: string;
  tuitionPayments: TuitionPaymentRow[];
  monthlyFeePayments: MonthlyPaymentRow[];
};

type ProfilePaymentRow =
  | { kind: "tuition"; id: number; period: string; paidAt: string; amount: number; bank: PaymentBank }
  | { kind: "monthly"; id: number; period: string; paidAt: string; amount: number; bank: PaymentBank };

function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString("en-US", { month: "long" });
}

function buildProfilePayments(student: StudentProfile): ProfilePaymentRow[] {
  const tuition = (student.tuitionPayments ?? []).map((p) => ({
    kind: "tuition" as const,
    id: p.id,
    period: "Registration",
    paidAt: p.paidAt || p.paymentDate,
    amount: p.amount,
    bank: p.bank,
  }));

  const monthly = (student.monthlyFeePayments ?? []).map((p) => ({
    kind: "monthly" as const,
    id: p.id,
    period: `${monthName(p.month)} ${p.year}`,
    paidAt: p.paidAt || p.paymentDate,
    amount: p.amount,
    bank: p.bank,
  }));

  return [...tuition, ...monthly].sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
  );
}

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      setLoading(true);
      await authFetch(`/api/students/by-id/${encodeURIComponent(studentId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then(setStudent);
      setLoading(false);
    })();
  }, [studentId]);

  const handlePrintIdCard = () => {
    if (!student) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>ID Card - ${student?.studentId}</title>
        <style>
          body { font-family: system-ui; padding: 20px; margin: 0; }
          .id-card { width: 340px; border: 2px solid #333; border-radius: 12px; overflow: hidden; }
          .id-header { background: #465FFF; color: white; padding: 12px; text-align: center; font-weight: bold; }
          .id-body { padding: 16px; display: flex; gap: 16px; }
          .id-photo { width: 80px; height: 100px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; }
          .id-photo img { width: 80px; height: 100px; object-fit: cover; }
          .id-info { flex: 1; }
          .id-row { margin-bottom: 6px; font-size: 13px; }
          .id-id { font-size: 18px; font-weight: bold; letter-spacing: 1px; margin-bottom: 8px; }
        </style>
        </head>
        <body>
          <div class="id-card">
            <div class="id-header">${BRAND.name}</div>
            <div class="id-body">
              <div class="id-photo">
                ${student?.imageUrl ? `<img src="${student.imageUrl}" alt="Photo" />` : `<span style="font-size: 32px;">${student?.firstName?.[0] || ""}${student?.lastName?.[0] || ""}</span>`}
              </div>
              <div class="id-info">
                <div class="id-id">${student?.studentId || ""}</div>
                <div class="id-row"><strong>${student?.firstName || ""} ${student?.lastName || ""}</strong></div>
                <div class="id-row">${student?.department?.name || ""} (${student?.department?.code || ""})</div>
                <div class="id-row">${student?.program || "—"} | ${student?.class ? `${student.class.department.code} ${student.class.name}` : "—"}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  if (loading) { 
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
      </div>
    );
  }

  if (!student) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Student Not Found" />
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-white/5">
          <p className="text-gray-500 dark:text-gray-400">Student with ID {studentId} not found.</p>
          <Button className="mt-4" size="sm" onClick={() => router.push("/admission")}>
            Back to Admission
          </Button>
        </div>
      </div>
    );
  }

  const InfoRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: LucideIcon;
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-0.5 font-medium text-gray-800 dark:text-white/90">{value}</p>
      </div>
    </div>
  );

  const paymentRows = buildProfilePayments(student);
  const totalPaid = paymentRows.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <PageBreadCrumb pageTitle={`${student.firstName} ${student.lastName}`} />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => router.push("/admission")}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          Back to Admission
        </button>
        <Button size="sm" variant="outline" onClick={handlePrintIdCard}>
          Print ID Card
        </Button>
      </div>

      <div className="space-y-6">
          {/* Student Profile */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                {student.imageUrl ? (
                  <Image
                    src={student.imageUrl}
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                  {student.firstName} {student.lastName}
                </h2>
                <p className="mt-1 font-mono text-sm tracking-wider text-brand-600 dark:text-brand-400">
                  {student.studentId}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                    {student.status}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {student.department.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
              <UserCircle className="h-5 w-5 text-brand-500" strokeWidth={1.8} />
              Student Information
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow
                icon={User}
                label="Full Name"
                value={`${student.firstName} ${student.lastName}`}
              />
              <InfoRow icon={User} label="Student ID" value={<span className="font-mono">{student.studentId}</span>} />
              <InfoRow
                icon={Building2}
                label="Department"
                value={`${student.department.name} (${student.department.code})`}
              />
              <InfoRow
                icon={GraduationCap}
                label="Class"
                value={
                  student.class
                    ? `${student.class.department.code} - ${student.class.name}`
                    : "—"
                }
              />
              <InfoRow icon={User} label="Gender" value={student.gender || "—"} />
              <InfoRow
                icon={CircleDollarSign}
                label="Payment Status"
                value={student.paymentStatus || "Fully Paid"}
              />
              <InfoRow
                icon={CircleDollarSign}
                label="Monthly fee"
                value={
                  student.fee != null
                    ? `$${student.fee.toLocaleString()}`
                    : "Not set"
                }
              />
              <InfoRow
                icon={CircleDollarSign}
                label="Balance"
                value={`$${(student.balance ?? 0).toLocaleString()}`}
              />
              <InfoRow
                icon={Calendar}
                label="Admission Date"
                value={new Date(student.admissionDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
              <Mail className="h-5 w-5 text-brand-500" strokeWidth={1.8} />
              Contact & Family
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow icon={Mail} label="Email" value={student.email || "—"} />
              <InfoRow icon={Phone} label="Phone" value={student.phone || "—"} />
              <InfoRow icon={Users} label="Mother Name" value={student.motherName || "—"} />
              <InfoRow icon={Phone} label="Parent Phone" value={student.parentPhone || "—"} />
              <InfoRow icon={MapPin} label="Address" value={student.address || "—"} />
            </div>

            <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
              <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-white/90">
                <CircleDollarSign className="h-5 w-5 text-brand-500" strokeWidth={1.8} />
                Registration Fee
              </h4>
              {(paymentRows.length === 0) ? (
                <p className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No payments recorded for this student.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-white/5 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Paid on</th>
                        <th className="px-4 py-3">Account</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {paymentRows.map((p) => (
                        <tr
                          key={`${p.kind}-${p.id}`}
                          className="text-gray-700 dark:text-gray-300"
                        >
                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                            {p.period}
                          </td>
                          <td className="px-4 py-3">
                            {p.kind === "tuition" ? "Registration fee" : "Monthly fee"}
                          </td>
                          <td className="px-4 py-3">
                            {new Date(p.paidAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                          </td>
                          <td className="px-4 py-3">{p.bank?.code ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">
                            ${p.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-white/5">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                          Total paid
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-white/90">
                          ${totalPaid.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}
