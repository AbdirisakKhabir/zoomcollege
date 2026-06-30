"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import { DateInput } from "@/components/form/DateInput";
import { authFetch } from "@/lib/api";
import { ChevronLeftIcon } from "@/icons";

type ClassOption = {
  id: number;
  name: string;
  department: { id: number; name: string; code: string };
};

type CourseOption = {
  id: number;
  code: string;
  name: string;
  creditHours: number;
  isActive: boolean;
};

type StudentOption = {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
};

type RecordEntry = {
  studentId: number;
  student: StudentOption;
  status: string;
  note: string;
};

const SHIFTS = ["Morning", "Afternoon", "Evening"];
const ATTENDANCE_STATUSES = ["Present", "Absent", "Late", "Excused"];

const selectClass =
  "h-11 w-full appearance-none rounded-lg border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white dark:focus:border-brand-500/40";

const inputClass =
  "h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-500/40";

export default function TakeAttendanceForm() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [takeForm, setTakeForm] = useState({
    classId: "",
    courseId: "",
    date: new Date().toISOString().split("T")[0],
    shift: "Morning",
  });
  const [students, setStudents] = useState<RecordEntry[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const sortedCourses = useMemo(
    () =>
      [...courses].sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { sensitivity: "base" })
      ),
    [courses]
  );

  async function loadCoursesForDepartment(departmentId: number) {
    setLoadingCourses(true);
    try {
      const res = await authFetch(
        `/api/courses?departmentId=${encodeURIComponent(String(departmentId))}`
      );
      if (res.ok) {
        const data: CourseOption[] = await res.json();
        setCourses(data.filter((c) => c.isActive !== false));
      } else {
        setCourses([]);
      }
    } finally {
      setLoadingCourses(false);
    }
  }

  async function loadStudentsForClass(classId: string) {
    if (!classId) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    try {
      const res = await authFetch(
        `/api/students?status=Admitted&classId=${encodeURIComponent(classId)}`
      );
      if (res.ok) {
        const admitted: (StudentOption & { status: string })[] = await res.json();
        setStudents(
          admitted.map((s) => ({
            studentId: s.id,
            student: {
              id: s.id,
              studentId: s.studentId,
              firstName: s.firstName,
              lastName: s.lastName,
              imageUrl: s.imageUrl,
            },
            status: "Present",
            note: "",
          }))
        );
      }
    } finally {
      setLoadingStudents(false);
    }
  }

  async function handleClassChange(classId: string, classOption?: ClassOption) {
    const cls = classOption ?? classes.find((c) => String(c.id) === classId);
    setTakeForm((f) => ({ ...f, classId, courseId: "" }));
    setCourses([]);
    if (!classId || !cls) {
      setStudents([]);
      return;
    }
    await Promise.all([
      loadCoursesForDepartment(cls.department.id),
      loadStudentsForClass(classId),
    ]);
  }

  useEffect(() => {
    (async () => {
      setLoadingClasses(true);
      const res = await authFetch("/api/classes");
      if (res.ok) {
        const data = await res.json();
        const list = data.map((c: ClassOption & Record<string, unknown>) => ({
          id: c.id,
          name: c.name,
          department: c.department,
        }));
        setClasses(list);
        if (list[0]) {
          const id = String(list[0].id);
          setTakeForm((f) => ({ ...f, classId: id }));
          await handleClassChange(id, list[0]);
        }
      }
      setLoadingClasses(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  function updateStudentStatus(studentId: number, status: string) {
    setStudents((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
  }

  function markAll(status: string) {
    setStudents((prev) => prev.map((r) => ({ ...r, status })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    if (!takeForm.classId || !takeForm.courseId || students.length === 0) {
      setSubmitError("Select a class, course, and ensure students are loaded.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: Number(takeForm.classId),
          courseId: Number(takeForm.courseId),
          date: takeForm.date,
          shift: takeForm.shift,
          records: students.map((r) => ({
            studentId: r.studentId,
            status: r.status,
            note: r.note || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to save attendance");
        return;
      }
      router.push("/attendance");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingClasses) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href="/attendance"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-400"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to Attendance
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Take Attendance</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select class, course, date, and shift, then mark each student.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            {submitError && (
              <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                {submitError}
              </div>
            )}

            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Class <span className="text-error-500">*</span>
                </label>
                <select
                  required
                  value={takeForm.classId}
                  onChange={(e) => void handleClassChange(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} ({c.department.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Course <span className="text-error-500">*</span>
                </label>
                <select
                  required
                  value={takeForm.courseId}
                  onChange={(e) =>
                    setTakeForm((f) => ({ ...f, courseId: e.target.value }))
                  }
                  disabled={
                    !takeForm.classId || loadingCourses || sortedCourses.length === 0
                  }
                  className={`${selectClass} disabled:opacity-50`}
                >
                  <option value="">
                    {!takeForm.classId
                      ? "Select class first"
                      : loadingCourses
                        ? "Loading courses…"
                        : sortedCourses.length === 0
                          ? "No courses in this department"
                          : "Select course"}
                  </option>
                  {sortedCourses.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <DateInput
                id="attendance-session-date"
                label={
                  <>
                    Date <span className="text-error-500">*</span>
                  </>
                }
                labelClassName="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                value={takeForm.date}
                onChange={(v) => setTakeForm((f) => ({ ...f, date: v }))}
                max={today}
                required
                inputClassName={inputClass}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Shift <span className="text-error-500">*</span>
                </label>
                <select
                  required
                  value={takeForm.shift}
                  onChange={(e) => setTakeForm((f) => ({ ...f, shift: e.target.value }))}
                  className={selectClass}
                >
                  {SHIFTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {students.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Mark all:</span>
                {ATTENDANCE_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => markAll(st)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      st === "Present"
                        ? "bg-success-50 text-success-600 hover:bg-success-100 dark:bg-success-500/10 dark:text-success-400"
                        : st === "Absent"
                          ? "bg-error-50 text-error-600 hover:bg-error-100 dark:bg-error-500/10 dark:text-error-400"
                          : st === "Late"
                            ? "bg-warning-50 text-warning-600 hover:bg-warning-100 dark:bg-warning-500/10 dark:text-warning-400"
                            : "bg-blue-light-50 text-blue-light-600 hover:bg-blue-light-100 dark:bg-blue-light-500/10 dark:text-blue-light-400"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}

            <div className="min-w-0 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
                </div>
              ) : students.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                  {takeForm.classId ? "No admitted students found." : "Select a class to load students."}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-white/3">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Student
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        ID
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {students.map((r) => (
                      <tr key={r.studentId} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-white/2">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {r.student.imageUrl ? (
                              <Image
                                src={r.student.imageUrl}
                                alt=""
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                {r.student.firstName.charAt(0)}
                                {r.student.lastName.charAt(0)}
                              </div>
                            )}
                            <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                              {r.student.firstName} {r.student.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{r.student.studentId}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {ATTENDANCE_STATUSES.map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => updateStudentStatus(r.studentId, st)}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                                  r.status === st
                                    ? st === "Present"
                                      ? "bg-success-500 text-white shadow-sm"
                                      : st === "Absent"
                                        ? "bg-error-500 text-white shadow-sm"
                                        : st === "Late"
                                          ? "bg-warning-500 text-white shadow-sm"
                                          : "bg-blue-light-500 text-white shadow-sm"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                }`}
                              >
                                {st.charAt(0)}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {students.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  Total: <strong>{students.length}</strong>
                </span>
                <span className="text-success-600 dark:text-success-400">
                  Present: {students.filter((r) => r.status === "Present").length}
                </span>
                <span className="text-error-600 dark:text-error-400">
                  Absent: {students.filter((r) => r.status === "Absent").length}
                </span>
                <span className="text-warning-600 dark:text-warning-400">
                  Late: {students.filter((r) => r.status === "Late").length}
                </span>
                <span className="text-blue-light-600 dark:text-blue-light-400">
                  Excused: {students.filter((r) => r.status === "Excused").length}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
            <Link href="/attendance">
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={
                submitting ||
                students.length === 0 ||
                !takeForm.courseId ||
                loadingCourses
              }
              size="sm"
            >
              {submitting ? "Saving..." : "Save Attendance"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
