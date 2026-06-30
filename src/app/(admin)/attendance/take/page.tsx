"use client";

import React from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import TakeAttendanceForm from "@/components/attendance/TakeAttendanceForm";
import { useAuth } from "@/context/AuthContext";

export default function TakeAttendancePage() {
  const { hasPermission } = useAuth();

  if (!hasPermission("attendance.create")) {
    return (
      <div>
        <PageBreadCrumb pageTitle="Take Attendance" />
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-16 dark:border-gray-800 dark:bg-white/3">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            You do not have permission to take attendance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadCrumb pageTitle="Take Attendance" />
      <div className="mt-6">
        <TakeAttendanceForm />
      </div>
    </div>
  );
}
