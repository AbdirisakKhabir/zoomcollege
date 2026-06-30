"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportFilterField, {
  ReportFilterSelect,
} from "@/components/reports/ReportFilterField";
import ReportDateRangeFilter from "@/components/reports/ReportDateRangeFilter";
import ReportContentArea from "@/components/reports/ReportContentArea";
import ReportSummaryBar, { ReportSummaryItem } from "@/components/reports/ReportSummaryBar";
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
import { useReportDateRange } from "@/hooks/useReportDateRange";
import Badge from "@/components/ui/badge/Badge";
import { authFetch } from "@/lib/api";
import { formatReportDateRange } from "@/lib/report-date-range";
import { exportReportCsv } from "@/lib/report-utils";

type Department = { id: number; name: string; code: string };
type ClassItem = {
  id: number;
  name: string;
  department: { id: number; name: string; code: string };
};
type RegistrationRow = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  paymentStatus: string;
  balance: number;
  department: { id: number; name: string; code: string; registrationFee: number | null };
  class: { id: number; name: string; department: { code: string } } | null;
  expectedFee: number;
  amountPaid: number;
  amountDue: number;
  isPaid: boolean;
  paidAt: string | null;
  paymentDate: string | null;
  bank: { code: string; name: string } | null;
};

export default function RegistrationFeeReportPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<RegistrationRow[]>([]);
  const [summary, setSummary] = useState({
    count: 0,
    paidCount: 0,
    unpaidCount: 0,
    totalCollected: 0,
    totalExpected: 0,
    totalOutstanding: 0,
  });
  const [loading, setLoading] = useState(false);
  const [filterDept, setFilterDept] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const { dateFrom: filterDateFrom, dateTo: filterDateTo, setDateFrom: setFilterDateFrom, setDateTo: setFilterDateTo } =
    useReportDateRange("empty-to-today");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: filterStatus });
      if (filterDept) params.set("departmentId", filterDept);
      if (filterClass) params.set("classId", filterClass);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);
      const res = await authFetch(`/api/reports/registration-fee?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setSummary(
          data.summary || {
            count: 0,
            paidCount: 0,
            unpaidCount: 0,
            totalCollected: 0,
            totalExpected: 0,
            totalOutstanding: 0,
          }
        );
      }
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [filterDept, filterClass, filterStatus, filterDateFrom, filterDateTo]);

  useEffect(() => {
    authFetch("/api/departments").then((r) => {
      if (r.ok) r.json().then((d: Department[]) => setDepartments(d));
    });
    authFetch("/api/classes").then((r) => {
      if (r.ok) r.json().then((d: ClassItem[]) => setClasses(d));
    });
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filteredClasses = filterDept
    ? classes.filter((c) => c.department?.id === Number(filterDept))
    : classes;
  const selectedDept = departments.find((d) => String(d.id) === filterDept);

  const {
    paginatedItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total,
    from,
    to,
  } = usePagination(students, [filterDept, filterClass, filterStatus, filterDateFrom, filterDateTo]);

  const handleExportCSV = () => {
    if (!students.length) return;
    exportReportCsv(
      `Registration_Fee_Report.csv`,
      [
        "Student ID",
        "Name",
        "Phone",
        "Department",
        "Class",
        "Payment Status",
        "Expected Fee",
        "Amount Paid",
        "Outstanding",
        "Status",
        "Paid On",
        "Account",
      ],
      students.map((s) => [
        s.studentId,
        `${s.firstName} ${s.lastName}`,
        s.phone ?? "",
        `${s.department.code} - ${s.department.name}`,
        s.class ? s.class.name : "—",
        s.paymentStatus,
        s.expectedFee,
        s.amountPaid,
        s.amountDue,
        s.isPaid ? "Paid" : "Unpaid",
        s.paymentDate ? new Date(s.paymentDate).toLocaleDateString() : "",
        s.bank?.code ?? "",
      ])
    );
  };

  const printMeta = [
    ...(selectedDept
      ? [{ label: "Department", value: `${selectedDept.code} — ${selectedDept.name}` }]
      : []),
    { label: "Status", value: filterStatus === "all" ? "All" : filterStatus === "paid" ? "Paid" : "Unpaid" },
    ...(filterDateFrom || filterDateTo
      ? [{ label: "Period", value: formatReportDateRange(filterDateFrom, filterDateTo) }]
      : []),
    { label: "Students", value: summary.count },
    { label: "Collected", value: `$${summary.totalCollected.toLocaleString()}` },
    { label: "Outstanding", value: `$${summary.totalOutstanding.toLocaleString()}` },
  ];

  return (
    <ReportPageShell
      pageTitle="Registration Fee Report"
      onExportCsv={handleExportCSV}
      exportDisabled={!students.length}
      actions={
        <Link href="/reports/payment">
          <Button variant="outline" size="sm">
            ← All Reports
          </Button>
        </Link>
      }
    >
      <ReportCard>
        <ReportFilterSection>
          <ReportFilterField label="Status">
            <ReportFilterSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              minWidth="140px"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </ReportFilterSelect>
          </ReportFilterField>
          <ReportFilterField label="Department">
            <ReportFilterSelect
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setFilterClass("");
              }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
          <ReportFilterField label="Class">
            <ReportFilterSelect
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              minWidth="200px"
            >
              <option value="">All Classes</option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.department?.code} - {c.name}
                </option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
          <ReportDateRangeFilter
            dateFrom={filterDateFrom}
            dateTo={filterDateTo}
            onDateFromChange={setFilterDateFrom}
            onDateToChange={setFilterDateTo}
            allowEmptyStart
          />
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : (
          <ReportContentArea
            title="Registration Fee Report"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <ReportSummaryItem label="students" value={summary.count} />
                <ReportSummaryItem label="paid" value={summary.paidCount} />
                <ReportSummaryItem label="unpaid" value={summary.unpaidCount} />
                <span className="font-medium text-green-700 dark:text-green-400">
                  <strong className="text-gray-800 dark:text-white/80">
                    ${summary.totalCollected.toLocaleString()}
                  </strong>{" "}
                  collected
                </span>
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  <strong className="text-gray-800 dark:text-white/80">
                    ${summary.totalOutstanding.toLocaleString()}
                  </strong>{" "}
                  outstanding
                </span>
              </ReportSummaryBar>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-transparent! hover:bg-transparent!">
                    <TableCell isHeader>Student ID</TableCell>
                    <TableCell isHeader>Name</TableCell>
                    <TableCell isHeader>Department</TableCell>
                    <TableCell isHeader>Class</TableCell>
                    <TableCell isHeader>Status</TableCell>
                    <TableCell isHeader className="text-right">Expected</TableCell>
                    <TableCell isHeader className="text-right">Paid</TableCell>
                    <TableCell isHeader className="text-right">Due</TableCell>
                    <TableCell isHeader>Paid On</TableCell>
                    <TableCell isHeader>Account</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-12 text-center text-gray-500">
                        No students match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {paginatedItems.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-sm">{s.studentId}</TableCell>
                          <TableCell className="font-medium">
                            {s.firstName} {s.lastName}
                          </TableCell>
                          <TableCell>{s.department.code}</TableCell>
                          <TableCell>{s.class ? s.class.name : "—"}</TableCell>
                          <TableCell>
                            <Badge color={s.isPaid ? "success" : "error"} size="sm">
                              {s.isPaid ? "Paid" : "Unpaid"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            ${s.expectedFee.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                            ${s.amountPaid.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-amber-600 dark:text-amber-400">
                            ${s.amountDue.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {s.paymentDate
                              ? new Date(s.paymentDate).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell>{s.bank?.code ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50 font-semibold dark:bg-gray-800/50">
                        <TableCell colSpan={5} className="text-right">
                          Total
                        </TableCell>
                        <TableCell className="text-right">
                          ${summary.totalExpected.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400">
                          ${summary.totalCollected.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-amber-600 dark:text-amber-400">
                          ${summary.totalOutstanding.toLocaleString()}
                        </TableCell>
                        <TableCell colSpan={2}> </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                className="no-print"
                page={page}
                totalPages={totalPages}
                total={total}
                from={from}
                to={to}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </ReportContentArea>
        )}
      </ReportCard>
    </ReportPageShell>
  );
}
