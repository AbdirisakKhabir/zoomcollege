"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportFilterField, { ReportFilterSelect } from "@/components/reports/ReportFilterField";
import ReportContentArea from "@/components/reports/ReportContentArea";
import ReportSummaryBar, { ReportSummaryItem } from "@/components/reports/ReportSummaryBar";
import ReportLoadingState from "@/components/reports/ReportLoadingState";
import { useAuth } from "@/context/AuthContext";
import {
  TablePagination,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/usePagination";
import Badge from "@/components/ui/badge/Badge";
import { authFetch } from "@/lib/api";
import { exportReportCsv } from "@/lib/report-utils";

type Department = { id: number; name: string; code: string };
type Course = { id: number; name: string; code: string; department?: Department };
type Lecturer = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  degree: string | null;
  isActive: boolean;
  departments: Department[];
  courses: Course[];
};

export default function LecturersReportPage() {
  const { hasPermission } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/lecturers");
      if (res.ok) setLecturers(await res.json());
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    authFetch("/api/departments").then((r) => {
      if (r.ok) r.json().then((d: Department[]) => setDepartments(d));
    });
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filteredLecturers = filterDept
    ? lecturers.filter((l) => l.departments?.some((d) => d.id === Number(filterDept)))
    : lecturers;

  const selectedDept = departments.find((d) => String(d.id) === filterDept);

  const {
    paginatedItems: paginatedLecturers,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total: lecturersTotal,
    from,
    to,
  } = usePagination(filteredLecturers, [filterDept]);

  const handleExportCSV = () => {
    exportReportCsv(
      `Lecturers_Report_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Email", "Phone", "Degree", "Departments", "Courses", "Status"],
      filteredLecturers.map((l) => [
        l.name,
        l.email,
        l.phone ?? "",
        l.degree ?? "",
        (l.departments ?? []).map((d) => d.code).join("; "),
        (l.courses ?? []).map((c) => c.code).join("; "),
        l.isActive ? "Active" : "Inactive",
      ])
    );
  };

  const printMeta = [
    ...(selectedDept
      ? [{ label: "Department", value: `${selectedDept.code} — ${selectedDept.name}` }]
      : []),
    { label: "Total Lecturers", value: filteredLecturers.length },
  ];

  if (!hasPermission("lecturers.view")) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Lecturer Report" />
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-16 dark:border-gray-800 dark:bg-white/3">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">You do not have permission to view this report.</p>
          <Link href="/reports" className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            ← Back to Reports
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ReportPageShell
      pageTitle="Lecturer Report"
      onExportCsv={handleExportCSV}
      exportDisabled={loading || filteredLecturers.length === 0}
    >
      <ReportCard>
        <ReportFilterSection>
          <ReportFilterField label="Department">
            <ReportFilterSelect
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : (
          <ReportContentArea
            title="Lecturer Report"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <ReportSummaryItem label="lecturers" value={filteredLecturers.length} />
              </ReportSummaryBar>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm print:text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50 print:border-black print:bg-transparent">
                    <th className="w-8 py-2.5 pl-3 pr-2 text-left font-semibold text-gray-700 print:text-black">#</th>
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">Name</th>
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">Email</th>
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">Phone</th>
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">Degree</th>
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">Departments</th>
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">Courses</th>
                    <th className="py-2.5 px-3 text-center font-semibold text-gray-700 print:text-black">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLecturers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-sm text-gray-500">
                        No lecturers match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedLecturers.map((l, idx) => (
                      <tr
                        key={l.id}
                        className={`border-b border-gray-100 print:border-gray-300 ${
                          idx % 2 === 1 ? "bg-gray-50/60 print:bg-transparent" : ""
                        }`}
                      >
                        <td className="py-2 pl-3 pr-2 text-xs text-gray-400 print:text-black">
                          {(page - 1) * pageSize + idx + 1}
                        </td>
                        <td className="py-2 px-3 font-medium print:text-black">{l.name}</td>
                        <td className="py-2 px-3 print:text-black">{l.email}</td>
                        <td className="py-2 px-3 print:text-black">{l.phone ?? "—"}</td>
                        <td className="py-2 px-3 print:text-black">{l.degree ?? "—"}</td>
                        <td className="py-2 px-3 print:text-black">
                          {(l.departments ?? []).length > 0
                            ? (l.departments ?? []).map((d) => d.code).join(", ")
                            : "—"}
                        </td>
                        <td className="py-2 px-3 print:text-black">
                          {(l.courses ?? []).length > 0
                            ? (l.courses ?? []).map((c) => c.code).join(", ")
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="no-print">
                            <Badge color={l.isActive ? "success" : "error"} size="sm">
                              {l.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </span>
                          <span className="hidden print:inline">
                            {l.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <TablePagination
                className="no-print"
                page={page}
                totalPages={totalPages}
                total={lecturersTotal}
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
