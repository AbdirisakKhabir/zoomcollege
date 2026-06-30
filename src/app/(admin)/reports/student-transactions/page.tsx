"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportFilterField, {
  ReportFilterInput,
  ReportFilterSelect,
} from "@/components/reports/ReportFilterField";
import ReportDateRangeFilter from "@/components/reports/ReportDateRangeFilter";
import ReportContentArea from "@/components/reports/ReportContentArea";
import ReportSummaryBar, { ReportSummaryItem } from "@/components/reports/ReportSummaryBar";
import ReportLoadingState from "@/components/reports/ReportLoadingState";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
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
import { authFetch } from "@/lib/api";
import { formatReportDateRange } from "@/lib/report-date-range";
import { exportReportCsv } from "@/lib/report-utils";

type Department = { id: number; name: string; code: string };
type ClassItem = {
  id: number;
  name: string;
    year: number;
  department: { id: number; name: string; code: string };
};


export default function StudentTransactionsReportPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [transactions, setTransactions] = useState<
    {
      studentId: string;
      firstName: string;
      lastName: string;
      department: { name: string; code: string };
      class: { department: { code: string }; name: string } | null;
      paidCount: number;
      unpaidCount: number;
      hasPaidRegistration: boolean;
      totalPaid: number;
      registrationFee: number | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [filterDept, setFilterDept] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const { dateFrom: filterDateFrom, dateTo: filterDateTo, setDateFrom: setFilterDateFrom, setDateTo: setFilterDateTo } =
    useReportDateRange("empty-to-today");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDept) params.set("departmentId", filterDept);
      if (filterClass) params.set("classId", filterClass);
      if (filterSearch.trim()) params.set("search", filterSearch.trim());
      if (filterPhone) params.set("phone", filterPhone);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);
      const res = await authFetch(`/api/finance/students-transactions?${params}`);
      if (res.ok) setTransactions(await res.json());
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [
    filterDept,
    filterClass,
    filterSearch,
    filterPhone,
    filterDateFrom,
    filterDateTo,
  ]);

  useEffect(() => {
    authFetch("/api/departments").then((r) => {
      if (r.ok) r.json().then((d: Department[]) => setDepartments(d));
    });
    authFetch("/api/classes").then((r) => {
      if (r.ok) r.json().then((d: ClassItem[]) => setClasses(d));
    });
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filteredClasses = filterDept
    ? classes.filter((c) => c.department?.id === Number(filterDept))
    : classes;

  const selectedDept = departments.find((d) => String(d.id) === filterDept);
  const selectedClass = classes.find((c) => String(c.id) === filterClass);

  const totalPaid = useMemo(
    () => transactions.reduce((s, t) => s + t.totalPaid, 0),
    [transactions]
  );

  const {
    paginatedItems: paginatedTransactions,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total: transactionsTotal,
    from,
    to,
  } = usePagination(transactions, [
    filterDept,
    filterClass,
    filterSearch,
    filterPhone,
    filterDateFrom,
    filterDateTo,
  ]);

  const handleExportCSV = () => {
    exportReportCsv(
      `Student_Transactions.csv`,
      ["Student ID", "Name", "Department", "Class", "Registration", "Total Paid"],
      transactions.map((t) => [
        t.studentId,
        `${t.firstName} ${t.lastName}`,
        `${t.department?.code} - ${t.department?.name}`,
        t.class ? `${t.class.department?.code} ${t.class.name}` : "—",
        t.hasPaidRegistration ? "Paid" : "Unpaid",
        t.totalPaid,
      ]),
      ["", "TOTAL", "", "", "", "", totalPaid]
    );
  };

  const dateRangeText = formatReportDateRange(filterDateFrom, filterDateTo);

  const printMeta = [
    ...(selectedDept
      ? [{ label: "Department", value: `${selectedDept.code} — ${selectedDept.name}` }]
      : []),
    ...(selectedClass
      ? [
          {
            label: "Class",
            value: `${selectedClass.department?.code} ${selectedClass.name} (${selectedClass.year})`,
          },
        ]
      : []),
    ...(filterSearch.trim()
      ? [{ label: "Search", value: filterSearch.trim() }]
      : []),
    { label: "Period", value: dateRangeText },
    { label: "Students", value: transactions.length },
    { label: "Total Paid", value: `$${totalPaid.toLocaleString()}` },
  ];

  return (
    <ReportPageShell
      pageTitle="Student Transactions Report"
      onExportCsv={handleExportCSV}
      exportDisabled={transactions.length === 0}
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
          <ReportFilterField label="Search Student" className="w-full sm:w-64">
            <ReportFilterInput
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Name, Student ID, or phone"
              className="w-full sm:min-w-[240px]"
            />
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
                  {c.department?.code} - {c.name} ({c.year})
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
            title="Student Transactions Report"
            printMeta={printMeta}
            summary={
              transactions.length > 0 ? (
                <ReportSummaryBar>
                  <ReportSummaryItem label="students" value={transactions.length} />
                  <span className="text-green-700 dark:text-green-400">
                    <strong className="text-gray-800 dark:text-white/80">
                      ${totalPaid.toLocaleString()}
                    </strong>{" "}
                    total paid
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">{dateRangeText}</span>
                </ReportSummaryBar>
              ) : undefined
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
                    <TableCell isHeader className="text-center">
                      Registration
                    </TableCell>
                    <TableCell isHeader className="text-right">
                      Total Paid
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-gray-500">
                        No student transactions match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {paginatedTransactions.map((t) => (
                        <TableRow key={t.studentId}>
                          <TableCell>
                            <span className="no-print">
                              <Link
                                href={`/students/${encodeURIComponent(t.studentId)}`}
                                className="font-mono font-medium text-brand-600 hover:underline dark:text-brand-400"
                              >
                                {t.studentId}
                              </Link>
                            </span>
                            <span className="hidden font-mono font-medium text-gray-800 print:inline">
                              {t.studentId}
                            </span>
                          </TableCell>
                          <TableCell>
                            {t.firstName} {t.lastName}
                          </TableCell>
                          <TableCell>
                            {t.department?.name} ({t.department?.code})
                          </TableCell>
                          <TableCell>
                            {t.class
                              ? `${t.class.department?.code} ${t.class.name}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              color={t.hasPaidRegistration ? "success" : "error"}
                              size="sm"
                            >
                              {t.hasPaidRegistration ? "Paid" : "Unpaid"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                            ${t.totalPaid.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {transactions.length > 0 && (
                        <TableRow className="bg-gray-50 font-semibold dark:bg-gray-800/50">
                          <TableCell colSpan={5} className="text-right">
                            Total
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                            ${totalPaid.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                className="no-print"
                page={page}
                totalPages={totalPages}
                total={transactionsTotal}
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
