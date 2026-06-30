"use client";

import { useAuth } from "@/context/AuthContext";

export default function DepartmentSwitcher() {
  const { user, setActiveDepartment } = useAuth();

  if (!user || user.isSuperAdmin || user.departmentAssignments.length === 0) {
    return null;
  }

  const activeId =
    user.activeDepartmentId ?? user.departmentAssignments[0]?.departmentId ?? "";

  return (
    <div className="hidden sm:block">
      <label className="sr-only" htmlFor="active-department">
        Active department
      </label>
      <select
        id="active-department"
        value={String(activeId)}
        onChange={(e) => void setActiveDepartment(Number(e.target.value))}
        className="h-10 max-w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
      >
        {user.departmentAssignments.map((a) => (
          <option key={a.departmentId} value={String(a.departmentId)}>
            {a.departmentCode} — {a.departmentName}
          </option>
        ))}
      </select>
    </div>
  );
}
