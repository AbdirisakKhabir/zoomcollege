"use client";

import React, { useEffect, useState, useCallback } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
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
import Badge from "@/components/ui/badge/Badge";
import Link from "next/link";
import { authFetch } from "@/lib/api";
import { ModalOverlayGate } from "@/context/ModalOverlayContext";
import { useAuth } from "@/context/AuthContext";
import { PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";

// Types
type ClassInfo = {
  id: number;
  name: string;
  courseId: number;
    year: number;
  course: { id: number; name: string; code: string; department?: { id: number; name: string; code: string } };
};

type CourseAssessmentInfo = {
  id: number;
  name: string;
  key: string;
  weightPercent: number;
  sortOrder: number;
};

type CourseInfo = {
  id: number;
  name: string;
  code: string;
  creditHours: number;
  department?: { id: number; name: string; code: string };
  assessments?: CourseAssessmentInfo[];
};

type StudentInfo = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
  classId?: number | null;
  departmentId?: number;
  department?: { id: number; name: string; code: string };
};

type ExamRecord = {
  id: number;
  studentId: number;
  courseId: number;
    year: number;
  scores: Record<string, number> | null;
  totalMarks: number;
  grade: string | null;
  gradePoints: number | null;
  student: StudentInfo;
  course: CourseInfo;
};

type YearGPA = {
  year: number;
  gpa: number;
  totalCredits: number;
  totalGradePoints: number;
  courses: number;
};

type GPAResponse = {
  student: StudentInfo;
  records: ExamRecord[];
  gpa: {
    cumulativeGPA: number;
    totalCredits: number;
    years: YearGPA[];
  };
};

const GRADE_COLORS: Record<string, "success" | "primary" | "warning" | "error" | "info"> = {
  A: "success",
  "A-": "success",
  "B+": "primary",
  B: "primary",
  "B-": "info",
  "C+": "warning",
  C: "warning",
  D: "error",
  F: "error",
};

function formatScoreBreakdown(
  scores: Record<string, number> | null | undefined,
  assessments: CourseAssessmentInfo[] | undefined
): string {
  if (!scores || !assessments?.length) return "—";
  const list = [...assessments].sort((a, b) => a.sortOrder - b.sortOrder);
  return list.map((a) => `${a.name.slice(0, 12)}:${scores[a.key] ?? 0}`).join(" · ");
}

export default function ExaminationsPage() {
  const { hasPermission } = useAuth();
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExamRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // GPA Modal state
  const [showGPAModal, setShowGPAModal] = useState(false);
  const [gpaData, setGpaData] = useState<GPAResponse | null>(null);
  const [gpaLoading, setGpaLoading] = useState(false);

  // Form
  const [form, setForm] = useState({
    studentId: "",
    courseId: "",
    year: new Date().getFullYear().toString(),
  });
  const [scoreForm, setScoreForm] = useState<Record<string, string>>({});
  const [courseAssessments, setCourseAssessments] = useState<CourseAssessmentInfo[]>([]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCourseId) params.set("courseId", filterCourseId);
      if (filterYear) params.set("year", filterYear);
      const res = await authFetch(`/api/examinations?${params.toString()}`);
      if (res.ok) setRecords(await res.json());
    } catch { /* empty */ }
    setLoading(false);
  }, [filterCourseId, filterYear]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await authFetch("/api/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.filter((s: StudentInfo & { status?: string }) => s.status === "Admitted"));
      }
    } catch { /* empty */ }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await authFetch("/api/courses");
      if (res.ok) setCourses(await res.json());
    } catch { /* empty */ }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await authFetch("/api/classes");
      if (res.ok) setClasses(await res.json());
    } catch { /* empty */ }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchStudents();
    fetchCourses();
    fetchClasses();
  }, [fetchStudents, fetchCourses, fetchClasses]);

  useEffect(() => {
    if (!showModal || !form.courseId) {
      setCourseAssessments([]);
      return;
    }
    const student = students.find((s) => String(s.id) === form.studentId);
    const classId = student?.classId;
    if (!classId) {
      setCourseAssessments([]);
      return;
    }
    const id = Number(form.courseId);
    authFetch(`/api/courses/${id}/assessments?classId=${classId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCourseAssessments(Array.isArray(d?.assessments) ? d.assessments : []))
      .catch(() => setCourseAssessments([]));
  }, [showModal, form.courseId, form.studentId, students]);

  useEffect(() => {
    if (!showModal || courseAssessments.length === 0) return;
    if (editingRecord) {
      const sc = (editingRecord.scores as Record<string, number>) || {};
      setScoreForm(
        Object.fromEntries(courseAssessments.map((a) => [a.key, String(sc[a.key] ?? 0)]))
      );
    } else {
      setScoreForm(
        Object.fromEntries(courseAssessments.map((a) => [a.key, "0"]))
      );
    }
  }, [showModal, courseAssessments, editingRecord?.id, form.courseId]);

  // Filtered records
  const filtered = records.filter((r) => {
    const searchLower = search.toLowerCase();
    const name = `${r.student.firstName} ${r.student.lastName}`.toLowerCase();
    const studentIdStr = r.student.studentId.toLowerCase();
    const courseStr = `${r.course.code} ${r.course.name}`.toLowerCase();
    return (
      name.includes(searchLower) ||
      studentIdStr.includes(searchLower) ||
      courseStr.includes(searchLower)
    );
  });

  const {
    paginatedItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total: filteredTotal,
    from,
    to,
  } = usePagination(filtered, [search, filterCourseId, filterYear]);

  const openEdit = (r: ExamRecord) => {
    setEditingRecord(r);
    setForm({
      studentId: r.studentId.toString(),
      courseId: r.courseId.toString(),
      year: r.year.toString(),
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    try {
      const scores: Record<string, number> = {};
      for (const a of courseAssessments) {
        scores[a.key] = Number(scoreForm[a.key] || 0);
      }

      const url = editingRecord ? `/api/examinations/${editingRecord.id}` : "/api/examinations";
      const method = editingRecord ? "PATCH" : "POST";
      const payload = editingRecord
        ? { scores }
        : {
            studentId: Number(form.studentId),
            courseId: Number(form.courseId),
            year: Number(form.year),
            scores,
          };

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to save");
        setSaving(false);
        return;
      }

      setShowModal(false);
      fetchRecords();
    } catch {
      setFormError("Network error");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this exam record?")) return;
    try {
      const res = await authFetch(`/api/examinations/${id}`, { method: "DELETE" });
      if (res.ok) fetchRecords();
    } catch { /* empty */ }
  };

  // GPA view
  const viewGPA = async (studentDbId: number) => {
    setGpaLoading(true);
    setShowGPAModal(true);
    setGpaData(null);
    try {
      const res = await authFetch(`/api/examinations/gpa?studentId=${studentDbId}`);
      if (res.ok) {
        setGpaData(await res.json());
      }
    } catch { /* empty */ }
    setGpaLoading(false);
  };

  const liveTotal = courseAssessments.reduce(
    (s, a) => s + Number(scoreForm[a.key] || 0),
    0
  );

  const getLiveGrade = (total: number) => {
    if (total >= 90) return "A";
    if (total >= 85) return "A-";
    if (total >= 80) return "B+";
    if (total >= 75) return "B";
    if (total >= 70) return "B-";
    if (total >= 65) return "C+";
    if (total >= 60) return "C";
    if (total >= 50) return "D";
    return "F";
  };

  // Get unique years from records
  const years = [...new Set(records.map((r) => r.year))].sort((a, b) => b - a);

  return (
    <div>
      <PageBreadCrumb pageTitle="Exam Records" />

      <div className="mb-4 flex items-center justify-between">
        {hasPermission("examinations.create") && (
          <Link href="/examinations/record" className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20">
            Record Exams →
          </Link>
        )}
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/5">
        {/* Header */}
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Exam Records
            </h3>
            <Badge variant="light" color="primary">
              {filtered.length} records
            </Badge>
          </div>
          {hasPermission("examinations.create") && (
            <Link
              href="/examinations/record"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
            >
              <PlusIcon className="h-4 w-4" />
              Add Record
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Search student, ID, or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 shadow-sm outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300 dark:border-gray-700 dark:text-white/80 sm:w-64"
          />
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/80"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/80"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Student</TableCell>
                <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Course</TableCell>
                <TableCell isHeader className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Year</TableCell>
                <TableCell isHeader className="min-w-[200px] px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Components</TableCell>
                <TableCell isHeader className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Total</TableCell>
                <TableCell isHeader className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Grade</TableCell>
                <TableCell isHeader className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">GP</TableCell>
                <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="px-5 py-10 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                      <span className="text-sm text-gray-500">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    No exam records found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((r) => (
                  <TableRow key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-white/2">
                    <TableCell className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                          {r.student.firstName[0]}{r.student.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {r.student.firstName} {r.student.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{r.student.studentId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{r.course.code}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{r.course.name}</p>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-center">
                      <Badge variant="light" color="info">{r.year}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px] px-5 py-3 text-left text-xs text-gray-600 dark:text-gray-400">
                      {formatScoreBreakdown(
                        (r.scores as Record<string, number>) || {},
                        r.course.assessments
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-center">
                      <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{r.totalMarks}</span>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-center">
                      <Badge variant="solid" color={GRADE_COLORS[r.grade || "F"] || "error"}>
                        {r.grade || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">{r.gradePoints?.toFixed(1) ?? "0.0"}</TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => viewGPA(r.student.id)}
                          className="rounded-lg p-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          title="View GPA"
                        >
                          GPA
                        </button>
                        {hasPermission("examinations.edit") && (
                          <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" title="Edit">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        {hasPermission("examinations.delete") && (
                          <button onClick={() => handleDelete(r.id)} className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400" title="Delete">
                            <TrashBinIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={filteredTotal}
          from={from}
          to={to}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* ======= Add/Edit Modal ======= */}
      {showModal && (
        <ModalOverlayGate>
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              {editingRecord ? "Edit Exam Record" : "Add Exam Record"}
            </h3>
            {formError && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Student */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Student *</label>
                <select
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  disabled={!!editingRecord}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 disabled:opacity-60 dark:border-gray-700 dark:text-white/80"
                >
                  <option value="">Select Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.studentId} - {s.firstName} {s.lastName}</option>
                  ))}
                </select>
              </div>

              {/* Course */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Course *</label>
                <select
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                  disabled={!!editingRecord}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 disabled:opacity-60 dark:border-gray-700 dark:text-white/80"
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name} ({c.creditHours} credits)</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Year *</label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  disabled={!!editingRecord}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 disabled:opacity-60 dark:border-gray-700 dark:text-white/80"
                />
              </div>
            </div>

            {/* Mark Components (from course assessment setup) */}
            <div className="mt-5">
              <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Mark Components</h4>
              {courseAssessments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {!form.studentId
                    ? "Select a student and course to load assessment components for that student's class."
                    : !students.find((s) => String(s.id) === form.studentId)?.classId
                      ? "This student has no class assigned — assign a class in Admission first."
                      : "No assessments found for this course in the student's class. Configure them on the Courses page."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {courseAssessments.map((a) => (
                    <div key={a.key}>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                        {a.name} <span className="text-gray-400">(max {a.weightPercent})</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={a.weightPercent}
                        step={0.5}
                        value={scoreForm[a.key] ?? ""}
                        onChange={(e) =>
                          setScoreForm((prev) => ({ ...prev, [a.key]: e.target.value }))
                        }
                        className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/80"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Total & Grade Preview */}
            <div className="mt-5 flex items-center gap-6 rounded-xl bg-gray-50 px-5 py-3 dark:bg-white/5">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{liveTotal}<span className="text-sm font-normal text-gray-400">/100</span></p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Grade</p>
                <Badge variant="solid" color={GRADE_COLORS[getLiveGrade(liveTotal)] || "error"}>
                  {getLiveGrade(liveTotal)}
                </Badge>
              </div>
              <div className="ml-auto h-3 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={`h-full rounded-full transition-all ${liveTotal >= 75 ? "bg-green-500" : liveTotal >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(liveTotal, 100)}%` }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <Button size="sm" onClick={handleSave} disabled={saving || !form.studentId || !form.courseId}>
                {saving ? "Saving..." : editingRecord ? "Update Record" : "Add Record"}
              </Button>
            </div>
          </div>
        </div>
        </ModalOverlayGate>
      )}

      {/* ======= GPA Modal ======= */}
      {showGPAModal && (
        <ModalOverlayGate>
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            {gpaLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
              </div>
            ) : gpaData ? (
              <>
                {/* Student Header */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    {gpaData.student.firstName[0]}{gpaData.student.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                      {gpaData.student.firstName} {gpaData.student.lastName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{gpaData.student.studentId} &middot; {gpaData.student.department?.name}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Cumulative GPA</p>
                    <p className={`text-3xl font-bold ${gpaData.gpa.cumulativeGPA >= 3.0 ? "text-green-600 dark:text-green-400" : gpaData.gpa.cumulativeGPA >= 2.0 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                      {gpaData.gpa.cumulativeGPA.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{gpaData.gpa.totalCredits} total credits</p>
                  </div>
                </div>

                {/* Year GPAs */}
                {gpaData.gpa.years.length > 0 && (
                  <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {gpaData.gpa.years.map((yr) => (
                      <div
                        key={yr.year}
                        className="rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800"
                      >
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{yr.year}</p>
                        <p className={`text-xl font-bold ${yr.gpa >= 3.0 ? "text-green-600 dark:text-green-400" : yr.gpa >= 2.0 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                          {yr.gpa.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-gray-400">{yr.courses} courses &middot; {yr.totalCredits} credits</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Detailed Records */}
                <div className="min-w-0 max-w-full overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Course</th>
                        <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">Year</th>
                        <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">Credits</th>
                        <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">Total</th>
                        <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">Grade</th>
                        <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">GP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gpaData.records.map((r) => (
                        <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800">
                          <td className="px-3 py-2">
                            <span className="font-medium text-gray-800 dark:text-white/90">{r.course.code}</span>
                            <span className="ml-2 text-gray-500 dark:text-gray-400">{r.course.name}</span>
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">{r.year}</td>
                          <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">{r.course.creditHours}</td>
                          <td className="px-3 py-2 text-center font-medium text-gray-800 dark:text-white/90">{r.totalMarks}</td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant="solid" color={GRADE_COLORS[r.grade || "F"] || "error"}>
                              {r.grade || "N/A"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">{r.gradePoints?.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">Failed to load GPA data.</p>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowGPAModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        </ModalOverlayGate>
      )}
    </div>
  );
}
