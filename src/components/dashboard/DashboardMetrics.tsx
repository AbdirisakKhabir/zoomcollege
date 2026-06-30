"use client";

import React from "react";
import Link from "next/link";
import {
  GroupIcon,
  TableIcon,
  ListIcon,
  CalenderIcon,
  PieChartIcon,
  PageIcon,
  ArrowRightIcon,
} from "@/icons";
import { useAuth } from "@/context/AuthContext";
import { useDashboard, type DashboardCounts } from "./DashboardContext";

const metricCards: {
  key: keyof DashboardCounts;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  gradient: string;
  iconBg: string;
  iconColor: string;
  ring: string;
}[] = [
  {
    key: "users",
    label: "Users",
    description: "Active system accounts",
    icon: <GroupIcon className="size-6" />,
    href: "/users",
    gradient: "from-violet-500/12 via-violet-500/5 to-transparent",
    iconBg: "bg-violet-500/15 dark:bg-violet-500/25",
    iconColor: "text-violet-600 dark:text-violet-400",
    ring: "group-hover:ring-violet-500/30",
  },
  {
    key: "admitted",
    label: "Students",
    description: "Currently admitted",
    icon: <PageIcon className="size-6" />,
    href: "/admission",
    gradient: "from-emerald-500/12 via-emerald-500/5 to-transparent",
    iconBg: "bg-emerald-500/15 dark:bg-emerald-500/25",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    ring: "group-hover:ring-emerald-500/30",
  },
  {
    key: "courses",
    label: "Courses",
    description: "Active curriculum",
    icon: <ListIcon className="size-6" />,
    href: "/courses",
    gradient: "from-sky-500/12 via-sky-500/5 to-transparent",
    iconBg: "bg-sky-500/15 dark:bg-sky-500/25",
    iconColor: "text-sky-600 dark:text-sky-400",
    ring: "group-hover:ring-sky-500/30",
  },
  {
    key: "classes",
    label: "Classes",
    description: "Running class sections",
    icon: <TableIcon className="size-6" />,
    href: "/classes",
    gradient: "from-amber-500/12 via-amber-500/5 to-transparent",
    iconBg: "bg-amber-500/15 dark:bg-amber-500/25",
    iconColor: "text-amber-600 dark:text-amber-400",
    ring: "group-hover:ring-amber-500/30",
  },
  {
    key: "attendance",
    label: "Attendance",
    description: "Sessions recorded",
    icon: <CalenderIcon className="size-6" />,
    href: "/attendance",
    gradient: "from-brand-500/12 via-brand-500/5 to-transparent",
    iconBg: "bg-brand-500/15 dark:bg-brand-500/25",
    iconColor: "text-brand-600 dark:text-brand-400",
    ring: "group-hover:ring-brand-500/30",
  },
  {
    key: "examRecords",
    label: "Exam Records",
    description: "Grades entered",
    icon: <PieChartIcon className="size-6" />,
    href: "/examinations",
    gradient: "from-teal-500/12 via-teal-500/5 to-transparent",
    iconBg: "bg-teal-500/15 dark:bg-teal-500/25",
    iconColor: "text-teal-600 dark:text-teal-400",
    ring: "group-hover:ring-teal-500/30",
  },
];

export default function DashboardMetrics() {
  const { user, isLoading: authLoading } = useAuth();
  const { data, loading } = useDashboard();
  const showNumbers = !authLoading && Boolean(user?.isSuperAdmin);

  if (authLoading || (showNumbers && loading)) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 md:gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200/80 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="h-12 w-12 rounded-2xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="mt-5 h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mt-2 h-9 w-16 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 md:gap-5">
      {metricCards.map(({ key, label, description, icon, href, gradient, iconBg, iconColor, ring }) => (
        <Link key={key} href={href} className="group">
          <div
            className={`relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:ring-1 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:shadow-none ${ring} md:p-6`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} dark:opacity-80`} />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg} ${iconColor} transition-transform duration-300 group-hover:scale-110`}
                >
                  {icon}
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100/80 text-gray-400 transition-all group-hover:bg-brand-500 group-hover:text-white dark:bg-gray-800/80 dark:group-hover:bg-brand-500">
                  <ArrowRightIcon className="size-4" />
                </span>
              </div>
              <div className="mt-5">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{label}</h4>
                {showNumbers && (
                  <>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {(data?.counts[key] ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{description}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
