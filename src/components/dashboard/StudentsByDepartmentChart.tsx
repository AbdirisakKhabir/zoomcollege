"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { useTheme } from "@/context/ThemeContext";
import { useDashboard } from "./DashboardContext";
import DashboardCard from "./DashboardCard";
import { getBaseChartOptions } from "./chartTheme";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const BAR_COLORS = ["#465FFF", "#7592FF", "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#14b8a6"];

export default function StudentsByDepartmentChart() {
  const { theme } = useTheme();
  const { data, loading } = useDashboard();
  const deptData = data?.studentsByDepartment ?? [];

  const options: ApexOptions = useMemo(() => {
    const base = getBaseChartOptions(theme);
    return {
      ...base,
      chart: { ...base.chart, type: "bar" },
      colors: BAR_COLORS,
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
          borderRadius: 8,
          borderRadiusApplication: "end",
          distributed: true,
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ["transparent"] },
      xaxis: {
        ...base.xaxis,
        categories: deptData.map((d) => d.department?.code ?? "—"),
      },
      yaxis: {
        labels: {
          style: { colors: theme === "dark" ? "#9CA3AF" : "#6B7280", fontSize: "12px" },
          formatter: (v) => Math.round(Number(v)).toString(),
        },
      },
      legend: { show: false },
      fill: { opacity: 1 },
      tooltip: {
        theme: theme === "dark" ? "dark" : "light",
        y: { formatter: (v) => `${v} students` },
      },
    };
  }, [theme, deptData]);

  return (
    <DashboardCard
      title="Students by Department"
      subtitle="Admitted students per department"
      icon={<span className="text-xs font-bold tracking-wide">DEPT</span>}
      iconClassName="bg-brand-500/15 text-brand-600 dark:bg-brand-500/25 dark:text-brand-400"
      actionHref="/departments"
      loading={loading}
    >
      {deptData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
          No data yet.
        </div>
      ) : (
        <div className="min-h-[300px]">
          <ReactApexChart
            options={options}
            series={[{ name: "Students", data: deptData.map((d) => d.count) }]}
            type="bar"
            height={300}
          />
        </div>
      )}
    </DashboardCard>
  );
}
