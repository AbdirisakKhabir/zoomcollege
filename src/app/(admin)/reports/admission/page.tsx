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
import { TablePagination } from "@/components/ui/table";
import { usePagination } from "@/hooks/usePagination";
import { authFetch } from "@/lib/api";

type Department = { id: number; name: string; code: string };
type ClassItem = {
  id: number;
  name: string;
    year: number;
  department: { id: number; name: string; code: string };
};
type Student = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  admissionDate: string;
  department: { id: number; name: string; code: string };
};

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "info"> = {
  Admitted: "success",
  Pending: "warning",
  Rejected: "error",
  Graduated: "info",
  Inactive: "error",
};

export default function AdmissionReportPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [summary, setSummary] = useState<{ total: number; byStatus: Record<string, number> }>({
    total: 0,
    byStatus: {},
  });
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDept) params.set("departmentId", filterDept);
      if (filterClass) params.set("classId", filterClass);
      if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);
      const res = await authFetch(`/api/reports/admission?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setSummary(data.summary || { total: 0, byStatus: {} });
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
  const selectedClass = classes.find((c) => String(c.id) === filterClass);

  const {
    paginatedItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total: studentsTotal,
    from,
    to,
  } = usePagination(students, [filterDept, filterClass, filterStatus]);

  const printMeta = [
    ...(selectedDept
      ? [{ label: "Department", value: `${selectedDept.code} — ${selectedDept.name}` }]
      : []),
    ...(selectedClass
      ? [
          {
            label: "Class",
            value: `${selectedClass.name} (${selectedClass.year})`,
          },
        ]
      : []),
    ...(filterStatus !== "all"
      ? [{ label: "Status", value: filterStatus }]
      : []),
    { label: "Total Students", value: summary.total },
  ];

  return (
    <ReportPageShell pageTitle="Admission Report">
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
          <ReportFilterField label="Status">
            <ReportFilterSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              minWidth="140px"
            >
              <option value="all">All Statuses</option>
              <option value="Admitted">Admitted</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
                <option value="Graduated">Graduated</option>
                <option value="Inactive">Inactive</option>
            </ReportFilterSelect>
          </ReportFilterField>
        </ReportFilterSection>

        {loading ? (
          <ReportLoadingState />
        ) : (
          <ReportContentArea
            title="Admission Report"
            printMeta={printMeta}
            summary={
              <ReportSummaryBar>
                <ReportSummaryItem label="students" value={summary.total} />
                {Object.entries(summary.byStatus || {}).map(([status, count]) => (
                  <span key={status} className="text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-800 dark:text-white/80">{count}</strong>{" "}
                    {status}
                  </span>
                ))}
              </ReportSummaryBar>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm print:text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50 print:border-black print:bg-transparent">
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">
                      Student ID
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">
                      Name
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">
                      Email
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">
                      Department
                    </th>
                    <th className="py-2.5 px-3 text-center font-semibold text-gray-700 print:text-black">
                      Status
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-gray-700 print:text-black">
                      Admission Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                        No students match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((s, idx) => (
                      <tr
                        key={s.id}
                        className={`border-b border-gray-100 print:border-gray-300 ${
                          idx % 2 === 1 ? "bg-gray-50/60 print:bg-transparent" : ""
                        }`}
                      >
                        <td className="py-2 px-3 font-mono text-xs print:text-black">
                          {s.studentId}
                        </td>
                        <td className="py-2 px-3 font-medium print:text-black">
                          {s.firstName} {s.lastName}
                        </td>
                        <td className="py-2 px-3 text-sm print:text-black">{s.email ?? "—"}</td>
                        <td className="py-2 px-3 print:text-black">{s.department?.code ?? "—"}</td>
                        <td className="py-2 px-3 text-center print:text-black">{s.status}</td>
                        <td className="py-2 px-3 text-sm print:text-black">
                          {s.admissionDate
                            ? new Date(s.admissionDate).toLocaleDateString()
                            : "—"}
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
                total={studentsTotal}
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
