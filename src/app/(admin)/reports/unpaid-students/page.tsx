"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/usePagination";
import { authFetch } from "@/lib/api";
import { exportReportCsv } from "@/lib/report-utils";

type ClassOption = {
  id: number;
  name: string;
  department: { id: number; code: string; name: string };
};
type UnpaidStudent = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  department: { name: string; code: string; registrationFee: number | null };
  registrationFee: number | null;
  paymentStatus?: string;
  amountPaid?: number;
  amountDue?: number;
};


export default function UnpaidStudentsReportPage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [unpaidClassId, setUnpaidClassId] = useState("");
  const [unpaidStudents, setUnpaidStudents] = useState<UnpaidStudent[]>([]);
  const [unpaidClassInfo, setUnpaidClassInfo] = useState<{
    name: string;
    department: { code: string; name: string };
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch("/api/classes").then((r) => {
      if (r.ok) r.json().then((d: ClassOption[]) => setClasses(d));
    });
  }, []);

  const filteredClasses = classes;

  useEffect(() => {
    if (unpaidClassId && !classes.some((c) => c.id === Number(unpaidClassId))) {
      setUnpaidClassId("");
    }
  }, [classes, unpaidClassId]);

  const handleGenerate = async () => {
    if (!unpaidClassId) return;
    setLoading(true);
    setUnpaidClassInfo(null);
    setUnpaidStudents([]);
    try {
      const params = new URLSearchParams({
        classId: unpaidClassId,
      });
      const res = await authFetch(`/api/finance/unpaid-students?${params}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to load unpaid students");
        return;
      }
      setUnpaidClassInfo(data.class);
      setUnpaidStudents(data.unpaidStudents || []);
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  const {
    paginatedItems: paginatedUnpaidStudents,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total: unpaidStudentsTotal,
    from,
    to,
  } = usePagination(unpaidStudents, [unpaidClassId, unpaidStudents]);

  const totalDue = unpaidStudents.reduce((s, t) => s + (t.registrationFee ?? 0), 0);

  const handleExportCSV = () => {
    if (unpaidStudents.length === 0) return;
    exportReportCsv(
      `Unpaid_Registration_${unpaidClassInfo?.department?.code || "class"}.csv`,
      [
        "Student ID",
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Department",
        "Payment Status",
        "Amount Due",
      ],
      unpaidStudents.map((s) => [
        s.studentId,
        s.firstName,
        s.lastName,
        s.email || "",
        s.phone || "",
        `${s.department.code} - ${s.department.name}`,
        s.paymentStatus || "Fully Paid",
        s.registrationFee != null ? String(s.registrationFee) : "",
      ]),
      ["", "TOTAL", "", "", "", "", "", totalDue.toFixed(2)]
    );
  };

  const printMeta = unpaidClassInfo
    ? [
        {
          label: "Class",
          value: `${unpaidClassInfo.department.code} - ${unpaidClassInfo.name}`,
        },
        { label: "Students", value: unpaidStudents.length },
        { label: "Total Amount Due", value: `$${totalDue.toLocaleString()}` },
      ]
    : [];

  return (
    <ReportPageShell
      pageTitle="Unpaid Students Report"
      onExportCsv={unpaidClassInfo ? handleExportCSV : undefined}
      exportDisabled={!unpaidClassInfo || unpaidStudents.length === 0}
      actions={
        <Link href="/reports/payment">
          <Button variant="outline" size="sm">
            ← All Reports
          </Button>
        </Link>
      }
    >
      <ReportCard>
        <ReportFilterSection
          title="Unpaid Registration Fees by Class"
          headerRight={
            <Button size="sm" onClick={handleGenerate} disabled={!unpaidClassId || loading}>
              {loading ? "Loading..." : "Generate List"}
            </Button>
          }
          hint={
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select a class to list students who have not paid their one-time registration fee.
            </p>
          }
        >
          <ReportFilterField label="Class">
            <ReportFilterSelect
              value={unpaidClassId}
              onChange={(e) => setUnpaidClassId(e.target.value)}
              minWidth="200px"
            >
              <option value="">Select class</option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.department.code} - {c.name}
                </option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : unpaidClassInfo ? (
          <ReportContentArea
            title="Unpaid Students Report"
            printMeta={printMeta}
            summary={
              unpaidStudents.length > 0 ? (
                <ReportSummaryBar className="bg-amber-50 dark:bg-amber-500/10">
                  <span className="text-sm">
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Students:{" "}
                    </span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      {unpaidStudents.length}
                    </span>
                  </span>
                  <span className="text-sm">
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Total Amount Due:{" "}
                    </span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      ${totalDue.toLocaleString()}
                    </span>
                  </span>
                </ReportSummaryBar>
              ) : undefined
            }
          >
            {unpaidStudents.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center dark:border-gray-700 dark:bg-white/5">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  All students in this class have paid their registration fee.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-transparent! hover:bg-transparent!">
                      <TableCell isHeader>Student ID</TableCell>
                      <TableCell isHeader>Name</TableCell>
                      <TableCell isHeader>Email</TableCell>
                      <TableCell isHeader>Phone</TableCell>
                      <TableCell isHeader>Department</TableCell>
                      <TableCell isHeader>Payment</TableCell>
                      <TableCell isHeader className="text-right">
                        Amount Due
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUnpaidStudents.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <span className="no-print">
                            <Link
                              href={`/students/${encodeURIComponent(s.studentId)}`}
                              className="font-mono font-medium text-brand-600 hover:underline dark:text-brand-400"
                            >
                              {s.studentId}
                            </Link>
                          </span>
                          <span className="hidden font-mono font-medium text-gray-800 print:inline">
                            {s.studentId}
                          </span>
                        </TableCell>
                        <TableCell>
                          {s.firstName} {s.lastName}
                        </TableCell>
                        <TableCell>{s.email || "—"}</TableCell>
                        <TableCell>{s.phone || "—"}</TableCell>
                        <TableCell>
                          {s.department.code} - {s.department.name}
                        </TableCell>
                        <TableCell>{s.paymentStatus || "Fully Paid"}</TableCell>
                        <TableCell className="text-right">
                          {s.registrationFee != null
                            ? `$${Number(s.registrationFee).toLocaleString()}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-semibold dark:bg-gray-800/50">
                      <TableCell colSpan={6} className="text-right">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-bold text-amber-600 dark:text-amber-400">
                        ${totalDue.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <TablePagination
                  className="no-print"
                  page={page}
                  totalPages={totalPages}
                  total={unpaidStudentsTotal}
                  from={from}
                  to={to}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </ReportContentArea>
        ) : null}
      </ReportCard>
    </ReportPageShell>
  );
}
