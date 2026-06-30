"use client";

import React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TablePagination,
  TableRow,
} from "../ui/table";
import { usePagination } from "@/hooks/usePagination";
import Badge from "../ui/badge/Badge";
import { PageIcon } from "@/icons";
import { useDashboard } from "./DashboardContext";
import DashboardCard from "./DashboardCard";

function StudentAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const colors = [
    "bg-violet-500/15 text-violet-600 dark:bg-violet-500/25 dark:text-violet-400",
    "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400",
    "bg-sky-500/15 text-sky-600 dark:bg-sky-500/25 dark:text-sky-400",
    "bg-amber-500/15 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400",
    "bg-brand-500/15 text-brand-600 dark:bg-brand-500/25 dark:text-brand-400",
  ];
  const colorIndex = (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length;

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${colors[colorIndex]}`}
    >
      {initials}
    </div>
  );
}

export default function RecentStudents() {
  const { data, loading } = useDashboard();
  const students = data?.recentStudents ?? [];

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
  } = usePagination(students, []);

  const statusColor = (s: string) =>
    s === "Admitted" ? "success" : s === "Pending" ? "warning" : s === "Rejected" ? "error" : "info";

  return (
    <DashboardCard
      title="Recent Students"
      subtitle="Latest admissions and applications"
      icon={<PageIcon className="size-5" />}
      iconClassName="bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400"
      actionHref="/admission"
      actionLabel="See all"
      loading={loading}
      className="h-full"
    >
      <div className="-mx-1 max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 pl-1 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Student
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Department
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Admitted
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-gray-500">
                  No students yet.
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((s) => (
                <TableRow
                  key={s.id}
                  className="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                >
                  <TableCell className="py-3.5 pl-1">
                    <Link href={`/students/${s.id}`} className="flex items-center gap-3 group">
                      <StudentAvatar firstName={s.firstName} lastName={s.lastName} />
                      <div>
                        <p className="font-medium text-gray-800 transition-colors group-hover:text-brand-600 dark:text-white/90 dark:group-hover:text-brand-400">
                          {s.firstName} {s.lastName}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{s.studentId}</span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {s.department?.code ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Badge
                      variant="light"
                      color={statusColor(s.status) as "success" | "warning" | "error" | "info"}
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 text-sm text-gray-600 dark:text-gray-300">
                    {s.admissionDate ? new Date(s.admissionDate).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {students.length > 0 && (
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={studentsTotal}
            from={from}
            to={to}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </DashboardCard>
  );
}
