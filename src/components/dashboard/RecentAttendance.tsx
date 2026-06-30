"use client";

import React from "react";
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
import { CalenderIcon } from "@/icons";
import { useDashboard } from "./DashboardContext";
import DashboardCard from "./DashboardCard";

function AttendanceRate({ present, absent, total }: { present: number; absent: number; total: number }) {
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
  const color =
    rate >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : rate >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-500 dark:text-red-400";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5 text-sm">
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{present}</span>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="font-medium text-red-500 dark:text-red-400">{absent}</span>
      </div>
      <span className={`text-[10px] font-medium ${color}`}>{rate}% present</span>
    </div>
  );
}

export default function RecentAttendance() {
  const { data, loading } = useDashboard();
  const sessions = data?.recentAttendance ?? [];

  const {
    paginatedItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    total: sessionsTotal,
    from,
    to,
  } = usePagination(sessions, []);

  return (
    <DashboardCard
      title="Recent Attendance"
      subtitle="Latest recorded class sessions"
      icon={<CalenderIcon className="size-5" />}
      iconClassName="bg-amber-500/15 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400"
      actionHref="/attendance"
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
                Class
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Date
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Shift
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Attendance
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                By
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-gray-500">
                  No attendance sessions yet.
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((s) => (
                <TableRow
                  key={s.id}
                  className="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                >
                  <TableCell className="py-3.5 pl-1">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white/90">
                        {s.class?.department?.code} – {s.class?.name}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {s.class?.department?.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 text-center text-sm text-gray-600 dark:text-gray-300">
                    {new Date(s.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="py-3.5 text-center">
                    <Badge variant="light" color="info" size="sm">
                      {s.shift}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 text-center">
                    <AttendanceRate present={s.present} absent={s.absent} total={s.totalRecords} />
                  </TableCell>
                  <TableCell className="py-3.5 text-sm text-gray-600 dark:text-gray-300">
                    {s.takenBy?.name ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {sessions.length > 0 && (
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={sessionsTotal}
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
