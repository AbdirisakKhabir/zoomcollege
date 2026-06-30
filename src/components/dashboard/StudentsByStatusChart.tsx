"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { useTheme } from "@/context/ThemeContext";
import { useDashboard } from "./DashboardContext";
import DashboardCard from "./DashboardCard";
import { getBaseChartOptions } from "./chartTheme";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const STATUS_COLORS: Record<string, string> = {
  Admitted: "#10b981",
  Pending: "#f59e0b",
  Rejected: "#ef4444",
  Graduated: "#6366f1",
  Inactive: "#9ca3af",
  Withdrawn: "#94a3b8",
};

export default function StudentsByStatusChart() {
  const { theme } = useTheme();
  const { data, loading } = useDashboard();
  const statusData = data?.studentsByStatus ?? [];

  const total = statusData.reduce((s, i) => s + i.count, 0);

  const options: ApexOptions = useMemo(() => {
    const base = getBaseChartOptions(theme);
    const colors = statusData.map((d) => STATUS_COLORS[d.status] ?? "#6366f1");
    return {
      ...base,
      chart: { ...base.chart, type: "donut" },
      colors,
      labels: statusData.map((d) => d.status),
      legend: {
        position: "bottom",
        horizontalAlign: "center",
        labels: { colors: theme === "dark" ? "#9CA3AF" : "#6B7280" },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${Math.round(val)}%`,
        style: { fontSize: "11px", fontWeight: "600" },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: { show: true, fontSize: "13px", color: theme === "dark" ? "#D1D5DB" : "#374151" },
              value: {
                show: true,
                fontSize: "22px",
                fontWeight: "700",
                color: theme === "dark" ? "#F9FAFB" : "#111827",
                formatter: (val) => val,
              },
              total: {
                show: true,
                label: "Total",
                fontSize: "13px",
                color: theme === "dark" ? "#9CA3AF" : "#6B7280",
                formatter: () => total.toString(),
              },
            },
          },
        },
      },
      tooltip: {
        theme: theme === "dark" ? "dark" : "light",
        y: { formatter: (val: number) => `${val} students` },
      },
    };
  }, [theme, statusData, total]);

  return (
    <DashboardCard
      title="Students by Status"
      subtitle="Application pipeline breakdown"
      icon={<span className="text-sm font-bold">%</span>}
      iconClassName="bg-violet-500/15 text-violet-600 dark:bg-violet-500/25 dark:text-violet-400"
      actionHref="/admission"
      loading={loading}
    >
      {statusData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
          No data yet.
        </div>
      ) : (
        <div className="min-h-[300px]">
          <ReactApexChart
            options={options}
            series={statusData.map((d) => d.count)}
            type="donut"
            height={300}
          />
        </div>
      )}
    </DashboardCard>
  );
}
