"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardMetrics from "./DashboardMetrics";
import RecentStudents from "./RecentStudents";
import RecentAttendance from "./RecentAttendance";
import RevenueChart from "./RevenueChart";
import StudentsByDepartmentChart from "./StudentsByDepartmentChart";
import StudentsByStatusChart from "./StudentsByStatusChart";
import AttendanceChart from "./AttendanceChart";

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 md:mb-5">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      {subtitle && (
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      )}
    </div>
  );
}

export default function DashboardContent() {
  const { user, isLoading } = useAuth();
  const isSuperAdmin = !isLoading && Boolean(user?.isSuperAdmin);

  return (
    <div className="space-y-8 md:space-y-10">
      <section>
        <DashboardMetrics />
      </section>

      {isSuperAdmin && (
        <>
          <section>
            <SectionHeading
              title="Analytics"
              subtitle="Financial and academic trends for this year"
            />
            <div className="grid grid-cols-12 gap-4 md:gap-6">
              <div className="col-span-12 lg:col-span-8">
                <RevenueChart />
              </div>
              <div className="col-span-12 lg:col-span-4">
                <StudentsByStatusChart />
              </div>
              <div className="col-span-12 lg:col-span-7">
                <StudentsByDepartmentChart />
              </div>
              <div className="col-span-12 lg:col-span-5">
                <AttendanceChart />
              </div>
            </div>
          </section>

          <section>
            <SectionHeading
              title="Recent Activity"
              subtitle="Latest students and attendance records"
            />
            <div className="grid grid-cols-12 gap-4 md:gap-6">
              <div className="col-span-12 lg:col-span-7">
                <RecentStudents />
              </div>
              <div className="col-span-12 lg:col-span-5">
                <RecentAttendance />
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
