"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import ReportPageShell from "@/components/reports/ReportPageShell";
import ReportCard from "@/components/reports/ReportCard";
import ReportFilterSection from "@/components/reports/ReportFilterSection";
import ReportFilterField, {
  ReportFilterSelect,
} from "@/components/reports/ReportFilterField";
import ReportContentArea from "@/components/reports/ReportContentArea";
import ReportSummaryBar, { ReportSummaryItem } from "@/components/reports/ReportSummaryBar";
import ReportLoadingState from "@/components/reports/ReportLoadingState";
import { useAuth } from "@/context/AuthContext";
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
import { authFetch } from "@/lib/api";
import { exportReportCsv } from "@/lib/report-utils";

type Position = { id: number; name: string; description?: string };
type Employee = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  positionId: number;
  position: { id: number; name: string };
  department: string | null;
  hireDate: string;
  isActive: boolean;
};

export default function HRReportPage() {
  const { hasPermission } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPosition, setFilterPosition] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/hr/employees");
      if (res.ok) setEmployees(await res.json());
    } catch {
      /* empty */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    authFetch("/api/hr/positions").then((r) => {
      if (r.ok) r.json().then((d: Position[]) => setPositions(d));
    });
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filteredEmployees = filterPosition
    ? employees.filter((e) => e.position?.id === Number(filterPosition))
    : employees;

  const selectedPosition = positions.find((p) => String(p.id) === filterPosition);

  const {
    paginatedItems: paginatedEmployees,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total: employeesTotal,
    from,
    to,
  } = usePagination(filteredEmployees, [filterPosition]);

  const handleExportCSV = () => {
    exportReportCsv(
      `HR_Report_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Email", "Phone", "Position", "Department", "Hire Date", "Status"],
      filteredEmployees.map((e) => [
        e.name,
        e.email,
        e.phone ?? "",
        e.position?.name ?? "",
        e.department ?? "",
        e.hireDate ? new Date(e.hireDate).toLocaleDateString() : "",
        e.isActive ? "Active" : "Inactive",
      ])
    );
  };

  const printMeta = [
    ...(selectedPosition ? [{ label: "Position", value: selectedPosition.name }] : []),
    { label: "Total Employees", value: filteredEmployees.length },
  ];

  if (!hasPermission("hr.view")) {
    return (
      <div>
        <PageBreadCrumb pageTitle="HR Report" />
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-16 dark:border-gray-800 dark:bg-white/3">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            You do not have permission to view this report.
          </p>
          <Link
            href="/reports"
            className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            ← Back to Reports
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ReportPageShell pageTitle="HR Report" onExportCsv={handleExportCSV}>
      <ReportCard>
        <ReportFilterSection>
          <ReportFilterField label="Position">
            <ReportFilterSelect
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
            >
              <option value="">All Positions</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </ReportFilterSelect>
          </ReportFilterField>
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : (
          <ReportContentArea
            title="Human Resources Report"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <ReportSummaryItem label="employees" value={filteredEmployees.length} />
              </ReportSummaryBar>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-transparent! hover:bg-transparent!">
                    <TableCell isHeader>#</TableCell>
                    <TableCell isHeader>Name</TableCell>
                    <TableCell isHeader>Email</TableCell>
                    <TableCell isHeader>Phone</TableCell>
                    <TableCell isHeader>Position</TableCell>
                    <TableCell isHeader>Department</TableCell>
                    <TableCell isHeader>Hire Date</TableCell>
                    <TableCell isHeader className="text-center">
                      Status
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-gray-500">
                        No employees match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEmployees.map((e, idx) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-gray-500">
                          {(page - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell>{e.email}</TableCell>
                        <TableCell>{e.phone ?? "—"}</TableCell>
                        <TableCell>{e.position?.name ?? "—"}</TableCell>
                        <TableCell>{e.department ?? "—"}</TableCell>
                        <TableCell>
                          {e.hireDate ? new Date(e.hireDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge color={e.isActive ? "success" : "error"} size="sm">
                            {e.isActive ? "Active" : "Inactive"}
                          </Badge>
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
                total={employeesTotal}
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
