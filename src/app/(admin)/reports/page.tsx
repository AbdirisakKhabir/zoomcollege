import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { PageIcon, PieChartIcon, ListIcon, DollarLineIcon } from "@/icons";

import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Reports"),
  description: `${BRAND.name} reports`,
};

const reportLinks = [
  { name: "Admission Report", path: "/reports/admission", icon: PageIcon, description: "View students by department and class with status breakdown" },
  { name: "Attendance Report", path: "/reports/attendance", icon: PieChartIcon, description: "View attendance sessions with present/absent/late/excused counts" },
  { name: "Attendance & Exam Report", path: "/reports/attendance-exam", icon: PieChartIcon, description: "View attendance % and exam results by class with attendance as 10% of grade" },
  { name: "Exam Report", path: "/reports/exam", icon: ListIcon, description: "View exam records by department and class with grade distribution" },
  { name: "Lecturer Report", path: "/reports/lecturers", icon: PageIcon, description: "View lecturers by department with courses and contact info" },
  { name: "HR Report", path: "/reports/hr", icon: PageIcon, description: "View employees by position with hire dates and status" },
  { name: "Students Report", path: "/reports/students-by-shift", icon: PageIcon, description: "All students by department with class schedule shifts" },
  { name: "Absent Attendance", path: "/reports/absent-attendance", icon: PieChartIcon, description: "Students absent over a threshold — bulk mark inactive" },
  { name: "Scholarship Report", path: "/reports/scholarship", icon: DollarLineIcon, description: "View students on full or half scholarship by department" },
  { name: "Individual Student Report", path: "/reports/individual-student", icon: PageIcon, description: "View payment history and balance for a single student" },
  { name: "Registration Fee Report", path: "/reports/registration-fee", icon: DollarLineIcon, description: "One-time registration fees — paid and unpaid by department and class" },
  { name: "Paid Students", path: "/reports/paid-students", icon: DollarLineIcon, description: "Students who paid monthly fees in a selected month" },
  { name: "Revenue Summary", path: "/reports/revenue-summary", icon: DollarLineIcon, description: "Target revenue vs amount collected per class" },
  { name: "Unpaid Students", path: "/reports/unpaid-students", icon: DollarLineIcon, description: "Generate list of students who have not paid for a specific year and class" },
];

export default function ReportsIndexPage() {
  return (
    <div>
      <PageBreadCrumb pageTitle="Reports" />
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Select a report to view and print. Each report can be printed separately.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportLinks.map((report) => (
          <Link key={report.path} href={report.path}>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-brand-200 hover:shadow-md dark:border-gray-800 dark:bg-white/5 dark:hover:border-brand-500/30">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                <report.icon className="size-6 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">{report.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
              <p className="mt-3 text-sm font-medium text-brand-600 dark:text-brand-400">View Report →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
