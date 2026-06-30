"use client";

import React, { useCallback, useEffect, useState } from "react";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportFilterField, {
  ReportFilterSelect,
} from "@/components/reports/ReportFilterField";
import ReportContentArea from "@/components/reports/ReportContentArea";
import ReportSummaryBar, { ReportSummaryItem } from "@/components/reports/ReportSummaryBar";
import ReportLoadingState from "@/components/reports/ReportLoadingState";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/usePagination";
import Badge from "@/components/ui/badge/Badge";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/api";
import { exportReportCsv } from "@/lib/report-utils";

type Department = { id: number; name: string; code: string };
type ClassItem = {
  id: number;
  name: string;
    year: number;
  department: { id: number; name: string; code: string };
};
type ScholarshipStudent = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  paymentStatus: string;
  balance: number;
  department: { id: number; name: string; code: string };
  class: { id: number; name: string; year: number } | null;
  monthlyFee: number;
  monthlyFeeBase: number;
};

export default function ScholarshipReportPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<ScholarshipStudent[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    fullScholarship: 0,
    halfScholar: 0,
  });
  const [loading, setLoading] = useState(false);
  const [filterDept, setFilterDept] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDept) params.set("departmentId", filterDept);
      if (filterClass) params.set("classId", filterClass);
      if (filterStatus) params.set("status", filterStatus);
      const res = await authFetch(`/api/reports/scholarship?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setSummary(
          data.summary || { total: 0, fullScholarship: 0, halfScholar: 0 }
        );
      }
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [filterDept, filterClass, filterStatus]);

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
  } = usePagination(students, [filterDept, filterClass, filterStatus]);

  const handleExportCSV = () => {
    if (!students.length) return;
    exportReportCsv(
      `Scholarship_Students_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Student ID",
        "Name",
        "Phone",
        "Email",
        "Department",
        "Class",
        "Scholarship Type",
        "Monthly Fee",
        "Balance",
      ],
      students.map((s) => [
        s.studentId,
        `${s.firstName} ${s.lastName}`,
        s.phone ?? "",
        s.email ?? "",
        `${s.department.code} - ${s.department.name}`,
        s.class ? `${s.class.name}` : "—",
        s.paymentStatus,
        s.monthlyFee,
        s.balance,
      ])
    );
  };

  const printMeta = [
    ...(selectedDept
      ? [{ label: "Department", value: `${selectedDept.code} — ${selectedDept.name}` }]
      : [{ label: "Department", value: user?.isSuperAdmin ? "All Departments" : "Assigned" }]),
    ...(filterStatus ? [{ label: "Scholarship Type", value: filterStatus }] : []),
    { label: "Total Students", value: summary.total },
    { label: "Full Scholarship", value: summary.fullScholarship },
    { label: "Half Scholar", value: summary.halfScholar },
  ];

  return (
    <ReportPageShell
      pageTitle="Scholarship Report"
      onExportCsv={handleExportCSV}
      exportDisabled={!students.length}
    >
      <ReportCard>
        <ReportFilterSection>
          <ReportFilterField label="Department">
            <ReportFilterSelect
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setFilterClass("");
              }}
            >
              {user?.isSuperAdmin && <option value="">All Departments</option>}
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
          <ReportFilterField label="Scholarship Type">
            <ReportFilterSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              minWidth="160px"
            >
              <option value="">All Scholarship Types</option>
              <option value="Full Scholarship">Full Scholarship</option>
              <option value="Half Scholar">Half Scholar</option>
            </ReportFilterSelect>
          </ReportFilterField>
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : (
          <ReportContentArea
            title="Scholarship Report"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <ReportSummaryItem label="scholarship students" value={summary.total} />
                <span className="text-green-700 dark:text-green-400">
                  <strong className="text-gray-800 dark:text-white/80">
                    {summary.fullScholarship}
                  </strong>{" "}
                  full scholarship
                </span>
                <span className="text-amber-700 dark:text-amber-400">
                  <strong className="text-gray-800 dark:text-white/80">
                    {summary.halfScholar}
                  </strong>{" "}
                  half scholar
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
                    <TableCell isHeader>Phone</TableCell>
                    <TableCell isHeader>Department</TableCell>
                    <TableCell isHeader>Class</TableCell>
                    <TableCell isHeader>Scholarship</TableCell>
                    <TableCell isHeader className="text-right">Monthly Fee</TableCell>
                    <TableCell isHeader className="text-right">Balance</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                        No scholarship students match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.studentId}</TableCell>
                        <TableCell className="font-medium">
                          {s.firstName} {s.lastName}
                        </TableCell>
                        <TableCell>{s.phone ?? "—"}</TableCell>
                        <TableCell>{s.department.code}</TableCell>
                        <TableCell>
                          {s.class
                            ? `${s.class.name}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            color={
                              s.paymentStatus === "Full Scholarship" ? "success" : "warning"
                            }
                            size="sm"
                          >
                            {s.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ${s.monthlyFee.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ${s.balance.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
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
