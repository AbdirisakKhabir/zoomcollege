"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { TablePagination } from "@/components/ui/table";
import { usePagination } from "@/hooks/usePagination";
import Badge from "@/components/ui/badge/Badge";
import { authFetch } from "@/lib/api";
import { ModalOverlayGate } from "@/context/ModalOverlayContext";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft, Pencil, Plus, Trash2 } from "lucide-react";

type Department = { id: number; name: string; code: string };

type SearchStudent = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  department: { id: number; name: string; code: string };
  class: { id: number; name: string } | null;
};

type CaseRow = {
  id: number;
  caseType: string;
  title: string;
  description: string | null;
  caseDate: string;
  status: string;
  resolution: string | null;
  student: {
    id: number;
    studentId: string;
    firstName: string;
    lastName: string;
    department: { id: number; name: string; code: string };
    class: { id: number; name: string } | null;
  };
  recordedBy: { id: number; name: string | null; email: string } | null;
};

const CASE_TYPES = ["Disciplinary", "Academic", "Medical", "Administrative", "Other"] as const;
const CASE_STATUSES = ["Open", "Resolved", "Closed"] as const;

const STATUS_COLOR: Record<string, "warning" | "success" | "error" | "info"> = {
  Open: "warning",
  Resolved: "success",
  Closed: "info",
};

const emptyForm = {
  studentId: 0,
  studentLabel: "",
  caseType: "Disciplinary",
  title: "",
  description: "",
  caseDate: new Date().toISOString().slice(0, 10),
  status: "Open",
  resolution: "",
};

export default function CaseRecordingPage() {
  const { hasPermission } = useAuth();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<SearchStudent[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canCreate = hasPermission("admission.create");
  const canEdit = hasPermission("admission.edit");
  const canDelete = hasPermission("admission.delete");

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (filterDept !== "all") params.set("departmentId", filterDept);
      if (filterType !== "all") params.set("caseType", filterType);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await authFetch(`/api/student-cases?${params}`);
      if (res.ok) setCases(await res.json());
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [search, filterDept, filterType, filterStatus]);

  useEffect(() => {
    authFetch("/api/departments").then((r) => {
      if (r.ok) r.json().then(setDepartments);
    });
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    const q = studentQuery.trim();
    if (q.length < 2) {
      setStudentResults([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      setStudentSearchLoading(true);
      try {
        const res = await authFetch(`/api/students/search?q=${encodeURIComponent(q)}&limit=10`);
        if (res.ok) setStudentResults(await res.json());
        else setStudentResults([]);
      } catch {
        setStudentResults([]);
      }
      setStudentSearchLoading(false);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [studentQuery]);

  function openAdd() {
    setModal("add");
    setEditingId(null);
    setForm(emptyForm);
    setStudentQuery("");
    setStudentResults([]);
    setSubmitError("");
  }

  function openEdit(row: CaseRow) {
    setModal("edit");
    setEditingId(row.id);
    setForm({
      studentId: row.student.id,
      studentLabel: `${row.student.firstName} ${row.student.lastName} (${row.student.studentId})`,
      caseType: row.caseType,
      title: row.title,
      description: row.description ?? "",
      caseDate: row.caseDate.slice(0, 10),
      status: row.status,
      resolution: row.resolution ?? "",
    });
    setStudentQuery("");
    setStudentResults([]);
    setSubmitError("");
  }

  function selectStudent(s: SearchStudent) {
    setForm((f) => ({
      ...f,
      studentId: s.id,
      studentLabel: `${s.firstName} ${s.lastName} (${s.studentId})`,
    }));
    setStudentQuery("");
    setStudentResults([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (!form.studentId) {
      setSubmitError("Please select a student");
      return;
    }
    if (!form.title.trim()) {
      setSubmitError("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        studentId: form.studentId,
        caseType: form.caseType,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        caseDate: form.caseDate,
        status: form.status,
        resolution: form.resolution.trim() || undefined,
      };

      const res =
        modal === "add"
          ? await authFetch("/api/student-cases", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await authFetch(`/api/student-cases/${editingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to save case");
        return;
      }

      await fetchCases();
      setModal(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this case record?")) return;
    const res = await authFetch(`/api/student-cases/${id}`, { method: "DELETE" });
    if (res.ok) await fetchCases();
    else {
      const data = await res.json();
      alert(data.error || "Failed to delete");
    }
  }

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
  } = usePagination(cases, [search, filterDept, filterType, filterStatus, cases.length]);

  if (!hasPermission("admission.view")) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Case Recording" />
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-16 dark:border-gray-800 dark:bg-white/3">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            You do not have permission to view case records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageBreadCrumb pageTitle="Case Recording" />
        <div className="flex flex-wrap gap-2">
          <Link href="/admission">
            <Button variant="outline" size="sm" startIcon={<ChevronLeft className="size-4" strokeWidth={1.75} />}>
              Student List
            </Button>
          </Link>
          {canCreate && (
            <Button
              startIcon={<Plus className="size-4" strokeWidth={1.75} />}
              onClick={openAdd}
              size="sm"
            >
              Record Case
            </Button>
          )}
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Student Cases</h3>
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-50 px-1.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              {cases.length}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <input
              type="text"
              placeholder="Search student, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-brand-300 dark:border-gray-700 dark:text-gray-300 sm:w-52"
            />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              <option value="all">All Types</option>
              {CASE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              <option value="all">All Statuses</option>
              {CASE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No case records match your filters.
            </p>
            {canCreate && (
              <Button className="mt-4" size="sm" onClick={openAdd}>
                Record first case
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedItems.map((row) => (
                <article
                  key={row.id}
                  className="flex flex-col rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition hover:border-brand-200 hover:shadow-sm dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-brand-500/30"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color={STATUS_COLOR[row.status] ?? "info"} size="sm">
                        {row.status}
                      </Badge>
                      <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-700">
                        {row.caseType}
                      </span>
                    </div>
                    <time className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(row.caseDate).toLocaleDateString()}
                    </time>
                  </div>

                  <h4 className="mb-2 line-clamp-2 text-base font-semibold text-gray-800 dark:text-white/90">
                    {row.title}
                  </h4>

                  {row.description && (
                    <p className="mb-3 line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
                      {row.description}
                    </p>
                  )}

                  <div className="mt-auto space-y-2 border-t border-gray-200 pt-3 dark:border-gray-800">
                    <div>
                      <Link
                        href={`/students/${encodeURIComponent(row.student.studentId)}`}
                        className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {row.student.firstName} {row.student.lastName}
                      </Link>
                      <p className="font-mono text-xs text-gray-500">{row.student.studentId}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{row.student.department.code}</span>
                      {row.student.class && <span>{row.student.class.name}</span>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Recorded by{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {row.recordedBy?.name || row.recordedBy?.email || "—"}
                      </span>
                    </p>
                  </div>

                  {(canEdit || canDelete) && (
                    <div className="mt-3 flex justify-end gap-1 border-t border-gray-200 pt-3 dark:border-gray-800">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-white hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-400"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              from={from}
              to={to}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[6, 12, 24, 48]}
            />
          </>
        )}
      </div>

      {modal && (
        <ModalOverlayGate>
          <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
                {modal === "add" ? "Record Case" : "Edit Case"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Student
                  </label>
                  {form.studentId > 0 ? (
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                      <span className="text-sm text-gray-800 dark:text-white/90">{form.studentLabel}</span>
                      {modal === "add" && (
                        <button
                          type="button"
                          className="text-xs text-brand-600 hover:underline"
                          onClick={() => setForm((f) => ({ ...f, studentId: 0, studentLabel: "" }))}
                        >
                          Change
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={studentQuery}
                        onChange={(e) => setStudentQuery(e.target.value)}
                        placeholder="Search by name or student ID..."
                        className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm dark:border-gray-700"
                      />
                      {studentSearchLoading && (
                        <p className="mt-1 text-xs text-gray-400">Searching...</p>
                      )}
                      {studentResults.length > 0 && (
                        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                          {studentResults.map((s) => (
                            <li key={s.id}>
                              <button
                                type="button"
                                onClick={() => selectStudent(s)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                              >
                                <span className="font-medium">
                                  {s.firstName} {s.lastName}
                                </span>
                                <span className="ml-2 font-mono text-xs text-gray-500">{s.studentId}</span>
                                <span className="ml-2 text-xs text-gray-400">{s.department.code}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Case Type
                    </label>
                    <select
                      value={form.caseType}
                      onChange={(e) => setForm((f) => ({ ...f, caseType: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm dark:border-gray-700"
                      required
                    >
                      {CASE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Case Date
                    </label>
                    <input
                      type="date"
                      value={form.caseDate}
                      onChange={(e) => setForm((f) => ({ ...f, caseDate: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm dark:border-gray-700"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Title
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm dark:border-gray-700"
                    placeholder="Brief summary of the case"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                    placeholder="Details of the incident or issue..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm dark:border-gray-700"
                    >
                      {CASE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(form.status === "Resolved" || form.status === "Closed") && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Resolution Notes
                    </label>
                    <textarea
                      value={form.resolution}
                      onChange={(e) => setForm((f) => ({ ...f, resolution: e.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
                      placeholder="How the case was resolved..."
                    />
                  </div>
                )}

                {submitError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setModal(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? "Saving…" : modal === "add" ? "Record Case" : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </ModalOverlayGate>
      )}
    </>
  );
}
