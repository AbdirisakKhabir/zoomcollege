"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { authFetch } from "@/lib/api";
import { ModalOverlayGate } from "@/context/ModalOverlayContext";
import { ChevronLeftIcon, UserCircleIcon, MailIcon, GroupIcon, UserIcon } from "@/icons";

type Department = { id: number; name: string; code: string };
type AcademicYearInfo = { id: number; name: string; startYear: number; endYear: number };
type ClassInfo = {
  id: number;
  name: string;
  departmentId?: number;
  department?: { id: number; code: string; name: string };
};

export type StudentFormData = {
  studentId: string;
  firstName: string;
  lastName: string;
  motherName: string;
  parentPhone: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  departmentId: string;
  classId: string;
  program: string;
  status: string;
  paymentStatus: string;
  fee: string;
  imageUrl: string;
  imagePublicId: string;
};

const STATUSES = ["Pending", "Admitted", "Rejected", "Graduated"];
const PAYMENT_STATUSES = ["Full Scholarship", "Half Scholar", "Fully Paid"] as const;

const defaultForm: StudentFormData = {
  studentId: "",
  firstName: "",
  lastName: "",
  motherName: "",
  parentPhone: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  departmentId: "",
  classId: "",
  program: "",
  status: "Admitted",
  paymentStatus: "Fully Paid",
  fee: "",
  imageUrl: "",
  imagePublicId: "",
};

type Props = {
  mode: "add" | "edit";
  editingId?: number;
  initialData?: Partial<StudentFormData>;
  departments: Department[];
  academicYears: AcademicYearInfo[];
  classes: ClassInfo[];
  onSuccess: () => void;
};

export default function StudentRegistrationForm({
  mode,
  editingId,
  initialData,
  departments,
  academicYears,
  classes,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<StudentFormData>({
    ...defaultForm,
    ...initialData,
    departmentId: initialData?.departmentId ?? (departments[0] ? String(departments[0].id) : ""),
  });
  const initialFullName = `${initialData?.firstName ?? ""} ${initialData?.lastName ?? ""}`.trim();
  const [fullName, setFullName] = useState(initialFullName);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [classList, setClassList] = useState<ClassInfo[]>(classes);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classModalError, setClassModalError] = useState("");
  const [classModalSubmitting, setClassModalSubmitting] = useState(false);
  const [newClassForm, setNewClassForm] = useState({
    name: "",
  });

  useEffect(() => {
    setClassList(classes);
  }, [classes]);

  function openClassModal() {
    if (!form.departmentId) {
      setSubmitError("Select a department before creating a class.");
      return;
    }
    setSubmitError("");
    setClassModalError("");
    setNewClassForm({ name: "" });
    setClassModalOpen(true);
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setClassModalError("");
    if (!form.departmentId) {
      setClassModalError("Select a department first.");
      return;
    }

    setClassModalSubmitting(true);
    try {
      const res = await authFetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClassForm.name.trim(),
          departmentId: Number(form.departmentId),
          capacity: 40,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setClassModalError(data.error || "Failed to create class");
        return;
      }
      const created: ClassInfo = {
        id: data.id,
        name: data.name,
        departmentId: data.departmentId,
        department: data.department,
      };
      setClassList((prev) => [...prev, created]);
      setForm((f) => ({ ...f, classId: String(created.id) }));
      setClassModalOpen(false);
    } finally {
      setClassModalSubmitting(false);
    }
  }

  const filteredClasses = classList.filter(
    (c) => !form.departmentId || (c.departmentId ?? c.department?.id) === Number(form.departmentId)
  );

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "university/students");
      const res = await authFetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error || "Image upload failed");
        setImagePreview(form.imageUrl || null);
        return;
      }
      const data = await res.json();
      setForm((f) => ({ ...f, imageUrl: data.url, imagePublicId: data.publicId }));
    } catch {
      setSubmitError("Image upload failed");
      setImagePreview(form.imageUrl || null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      if (form.fee.trim() !== "") {
        const f = Number(form.fee);
        if (Number.isNaN(f) || f < 0) {
          setSubmitError("Monthly fee must be a valid non-negative number");
          setSubmitting(false);
          return;
        }
      }
      const payload: Record<string, unknown> = {
        studentId: form.studentId.trim() || undefined,
        firstName: form.firstName,
        lastName: form.lastName,
        motherName: form.motherName || undefined,
        parentPhone: form.parentPhone || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        address: form.address || undefined,
        departmentId: Number(form.departmentId),
        classId: form.classId || undefined,
        program: form.program || undefined,
        status: form.status,
        paymentStatus: form.paymentStatus || "Fully Paid",
        imageUrl: form.imageUrl || undefined,
        imagePublicId: form.imagePublicId || undefined,
      };
      if (form.fee.trim() !== "") {
        payload.fee = Number(form.fee);
      } else if (mode === "edit") {
        payload.fee = null;
      }
      if (mode === "add") {
        const res = await authFetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setSubmitError(data.error || "Failed to create student");
          return;
        }
        onSuccess();
      } else if (mode === "edit" && editingId) {
        const res = await authFetch(`/api/students/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setSubmitError(data.error || "Failed to update student");
          return;
        }
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/15 dark:border-gray-600 dark:bg-gray-800/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-500 dark:focus:bg-gray-800 dark:focus:ring-brand-500/20";
  const selectClass =
    "h-11 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/15 dark:border-gray-600 dark:bg-gray-800/50 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800 dark:focus:ring-brand-500/20";

  const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) => (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/admission"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand-400"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to Admission
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {submitError && (
          <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400">
            {submitError}
          </div>
        )}

        {/* Header Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5">
            <h2 className="text-xl font-bold text-white">
              {mode === "add" ? "New Student Registration" : "Edit Student"}
            </h2>
            <p className="mt-1 text-sm text-white/80">
              {mode === "add" ? "Fill in the details below to register a new student" : "Update the student information"}
            </p>
          </div>
        </div>

        {/* Photo & Basic Info */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <SectionHeader icon={UserCircleIcon} title="Student Photo" subtitle="Optional profile picture for ID cards" />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div
              className="relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 transition-all hover:border-brand-400 hover:bg-brand-50/30 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-brand-500 dark:hover:bg-brand-500/10"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading && <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />}
              {!uploading && imagePreview && <Image src={imagePreview} alt="Preview" fill className="object-cover" />}
              {!uploading && !imagePreview && (
                <div className="flex flex-col items-center gap-1">
                  <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  </svg>
                  <span className="text-xs font-medium text-gray-500">Click Here to upload</span>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageUpload} />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Student ID <span className="text-gray-400">(optional, auto-generated if empty)</span>
                </label>
                <input type="text" value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} placeholder="e.g. STD-2026-0001" className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFullName(value);
                    const parts = value.trim().split(/\s+/);
                    const first = parts[0] ?? "";
                    const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
                    setForm((f) => ({ ...f, firstName: first, lastName: last }));
                  }}
                  placeholder="Full name"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Family */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <SectionHeader icon={MailIcon} title="Contact & Family" subtitle="Contact details and family information" />
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Mother Name</label>
                <input type="text" value={form.motherName} onChange={(e) => setForm((f) => ({ ...f, motherName: e.target.value }))} placeholder="Mother's full name" className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Parent Phone</label>
                <input type="tel" value={form.parentPhone} onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))} placeholder="+252 xxx xxx" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="student@email.com (optional)" className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+252 xxx xxx" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
              <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} className={selectClass}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
              <textarea rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Home address" className={`${inputClass} resize-none`} />
            </div>
          </div>
        </div>

        {/* Status & Fees */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <SectionHeader icon={UserIcon} title="Status & Fees" subtitle="Admission status and payment details" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={selectClass}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Status</label>
              <select value={form.paymentStatus} onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value }))} className={selectClass}>
                {PAYMENT_STATUSES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Monthly fee <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.fee}
                onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))}
                placeholder="e.g. 150"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Academic Info */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <SectionHeader icon={GroupIcon} title="Academic Information" subtitle="Department and class" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Department <span className="text-error-500">*</span></label>
              <select required value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value, classId: "" }))} className={selectClass}>
                <option value="">Select a department</option>
                {departments.map((d) => <option key={d.id} value={String(d.id)}>{d.name} ({d.code})</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Class</label>
              <div className="flex gap-2">
                <select value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))} className={`${selectClass} min-w-0 flex-1`}>
                  <option value="">Optional</option>
                  {filteredClasses.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.department?.code ?? "—"} - {c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={openClassModal}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                  aria-label="Create new class"
                  title="Create new class"
                >
                  <Plus className="size-5" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row dark:border-gray-700 dark:bg-gray-900">
          <Link href="/admission" className="w-full sm:w-auto">
            <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">Cancel</Button>
          </Link>
          <Button type="submit" disabled={submitting || uploading} size="sm" className="w-full sm:w-auto">
            {submitting ? "Saving..." : mode === "add" ? "Admit Student" : "Update Student"}
          </Button>
        </div>
      </form>

      {classModalOpen && (
        <ModalOverlayGate>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">New Class</h2>
                <button
                  type="button"
                  onClick={() => setClassModalOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateClass} className="space-y-4 px-6 py-5">
                {classModalError && (
                  <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                    {classModalError}
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Class name <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newClassForm.name}
                    onChange={(e) => setNewClassForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Level 1-A"
                    className={inputClass}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Department: {departments.find((d) => String(d.id) === form.departmentId)?.name ?? "—"}
                </p>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setClassModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={classModalSubmitting}>
                    {classModalSubmitting ? "Creating..." : "Create class"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </ModalOverlayGate>
      )}
    </div>
  );
}
