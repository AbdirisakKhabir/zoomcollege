"use client";

import React, { useCallback, useEffect, useState } from "react";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportFilterField, {
  ReportFilterInput,
  ReportFilterSelect,
} from "@/components/reports/ReportFilterField";
import ReportContentArea from "@/components/reports/ReportContentArea";
import ReportSummaryBar from "@/components/reports/ReportSummaryBar";
import ReportLoadingState from "@/components/reports/ReportLoadingState";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authFetch } from "@/lib/api";
import { exportReportCsv } from "@/lib/report-utils";

type StudentOption = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  departmentId: number;
};

type ReportData = {
  student: {
    id: number;
    studentId: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    gender: string | null;
    status: string;
    paymentStatus: string;
    balance: number;
    monthlyFee: number;
    admissionDate: string;
    department: { name: string; code: string };
    class: {
      name: string;
            year: number;
      department: { code: string; name: string };
    } | null;
    admissionAcademicYear: { name: string } | null;
  };
  registrationPayments: {
    id: number;
    year: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    bank: { code: string; name: string } | null;
  }[];
  monthlyFeePayments: {
    id: number;
    year: number;
    month: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    bank: { code: string; name: string };
  }[];
  monthlyInvoices: { id: number; year: number; month: number; amount: number }[];
  summary: {
    totalRegistrationPaid: number;
    totalMonthlyPaid: number;
    totalPaid: number;
    registrationPaymentCount: number;
    monthlyPaymentCount: number;
    invoiceCount: number;
  };
};

function monthLabel(y: number, m: number) {
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
}

export default function IndividualStudentReportPage() {
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    authFetch("/api/students?status=Admitted")
      .then((r) => {
        if (r.ok) r.json().then((d: StudentOption[]) => setStudentOptions(d));
      })
      .finally(() => setLoadingStudents(false));
  }, []);

  const filteredOptions = studentOptions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.studentId.toLowerCase().includes(q) ||
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q)
    );
  });

  const fetchReport = useCallback(async () => {
    if (!selectedStudentId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(
        `/api/reports/individual-student?studentId=${encodeURIComponent(selectedStudentId)}`
      );
      if (res.ok) setData(await res.json());
      else setData(null);
    } catch {
      setData(null);
    }
    setLoading(false);
  }, [selectedStudentId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = () => {
    if (!data) return;
    const s = data.student;
    const rows: (string | number)[][] = [
      ["REGISTRATION FEE PAYMENTS"],
      ["Amount", "Date", "Account", "Method"],
      ...data.registrationPayments.map((p) => [
        p.amount,
        new Date(p.paymentDate).toLocaleDateString(),
        p.bank?.code ?? "—",
        p.paymentMethod,
      ]),
      [],
      ["MONTHLY FEE PAYMENTS"],
      ["Month", "Amount", "Date", "Account", "Method"],
      ...data.monthlyFeePayments.map((p) => [
        monthLabel(p.year, p.month),
        p.amount,
        new Date(p.paymentDate).toLocaleDateString(),
        p.bank.code,
        p.paymentMethod,
      ]),
    ];
    exportReportCsv(
      `Student_Report_${s.studentId}.csv`,
      ["Field", "Value"],
      [
        ["Student ID", s.studentId],
        ["Name", `${s.firstName} ${s.lastName}`],
        ["Department", `${s.department.code} - ${s.department.name}`],
        ["Balance", s.balance],
        ["Total Paid", data.summary.totalPaid],
        ...rows.flatMap((r) => (r.length === 0 ? [] : [r])),
      ]
    );
  };

  const printMeta = data
    ? [
        { label: "Student ID", value: data.student.studentId },
        {
          label: "Name",
          value: `${data.student.firstName} ${data.student.lastName}`,
        },
        {
          label: "Department",
          value: `${data.student.department.code} — ${data.student.department.name}`,
        },
        { label: "Payment Status", value: data.student.paymentStatus },
        { label: "Balance", value: `$${data.student.balance.toLocaleString()}` },
        { label: "Total Paid", value: `$${data.summary.totalPaid.toLocaleString()}` },
      ]
    : [];

  return (
    <ReportPageShell
      pageTitle="Individual Student Report"
      onExportCsv={handleExportCSV}
      exportDisabled={!data}
    >
      <ReportCard>
        <ReportFilterSection>
          <ReportFilterField label="Search Student" className="w-full sm:w-64">
            <ReportFilterInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or Student ID"
            />
          </ReportFilterField>
          <ReportFilterField label="Select Student">
            <ReportFilterSelect
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              minWidth="280px"
              disabled={loadingStudents}
            >
              <option value="">— Select a student —</option>
              {filteredOptions.map((s) => (
                <option key={s.id} value={s.studentId}>
                  {s.studentId} — {s.firstName} {s.lastName}
                </option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
        </ReportFilterSection>

        {!selectedStudentId ? (
          <div className="px-5 py-16 text-center text-sm text-gray-500">
            Select a student to view their individual report.
          </div>
        ) : loading ? (
          <ReportLoadingState />
        ) : !data ? (
          <div className="px-5 py-16 text-center text-sm text-gray-500">
            Student not found or access denied.
          </div>
        ) : (
          <ReportContentArea
            title="Individual Student Report"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <span className="font-medium text-gray-800 dark:text-white/90">
                  {data.student.firstName} {data.student.lastName} ({data.student.studentId})
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Balance:{" "}
                  <strong className="text-gray-800 dark:text-white/80">
                    ${data.student.balance.toLocaleString()}
                  </strong>
                </span>
                <span className="text-green-700 dark:text-green-400">
                  Total paid:{" "}
                  <strong>${data.summary.totalPaid.toLocaleString()}</strong>
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Registration: ${data.summary.totalRegistrationPaid.toLocaleString()} · Monthly: $
                  {data.summary.totalMonthlyPaid.toLocaleString()}
                </span>
              </ReportSummaryBar>
            }
          >
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-xs text-gray-500">Department</p>
                <p className="font-semibold text-gray-800 dark:text-white/90">
                  {data.student.department.code} — {data.student.department.name}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-xs text-gray-500">Class</p>
                <p className="font-semibold text-gray-800 dark:text-white/90">
                  {data.student.class
                    ? `${data.student.class.name}`
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-xs text-gray-500">Payment Status</p>
                <Badge
                  color={
                    data.student.paymentStatus === "Full Scholarship"
                      ? "success"
                      : data.student.paymentStatus === "Half Scholar"
                        ? "warning"
                        : "info"
                  }
                  size="sm"
                >
                  {data.student.paymentStatus}
                </Badge>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-xs text-gray-500">Monthly Fee</p>
                <p className="font-semibold text-gray-800 dark:text-white/90">
                  ${data.student.monthlyFee.toLocaleString()}
                </p>
              </div>
            </div>

            <h4 className="mb-3 font-semibold text-gray-800 dark:text-white/90">
              Registration Fee
            </h4>
            <div className="mb-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-transparent! hover:bg-transparent!">
                    <TableCell isHeader className="text-right">Amount</TableCell>
                    <TableCell isHeader>Date</TableCell>
                    <TableCell isHeader>Account</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.registrationPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-gray-500">
                        No registration fee payment recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.registrationPayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-right font-semibold text-green-600">
                          ${p.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{p.bank?.code ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <h4 className="mb-3 font-semibold text-gray-800 dark:text-white/90">
              Monthly Fee Payments
            </h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-transparent! hover:bg-transparent!">
                    <TableCell isHeader>Month</TableCell>
                    <TableCell isHeader className="text-right">Amount</TableCell>
                    <TableCell isHeader>Date</TableCell>
                    <TableCell isHeader>Account</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.monthlyFeePayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                        No monthly fee payments recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.monthlyFeePayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{monthLabel(p.year, p.month)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          ${p.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{p.bank.code}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ReportContentArea>
        )}
      </ReportCard>
    </ReportPageShell>
  );
}
