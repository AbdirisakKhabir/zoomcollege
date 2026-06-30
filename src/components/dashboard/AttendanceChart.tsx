"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { CalenderIcon } from "@/icons";
import { useTheme } from "@/context/ThemeContext";
import { useDashboard } from "./DashboardContext";
import DashboardCard from "./DashboardCard";
import { getBaseChartOptions } from "./chartTheme";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function AttendanceChart() {
  const { theme } = useTheme();
  const { data, loading } = useDashboard();
  const attendanceByMonth = data?.chartData.attendanceByMonth ?? [];
  const totalSessions = attendanceByMonth.reduce((s, m) => s + m.count, 0);

  const options: ApexOptions = useMemo(() => {
    const base = getBaseChartOptions(theme);
    return {
      ...base,
      chart: { ...base.chart, type: "bar" },
      colors: ["#6366f1"],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "50%",
          borderRadius: 8,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ["transparent"] },
      xaxis: {
        ...base.xaxis,
        categories: attendanceByMonth.map((m) => m.month),
      },
      yaxis: {
        labels: {
          style: { colors: theme === "dark" ? "#9CA3AF" : "#6B7280", fontSize: "12px" },
          formatter: (v) => Math.round(Number(v)).toString(),
        },
      },
      fill: {
        type: "gradient",
        gradient: {
          shade: theme === "dark" ? "dark" : "light",
          type: "vertical",
          opacityFrom: 1,
          opacityTo: 0.7,
          stops: [0, 100],
        },
      },
      tooltip: {
        theme: theme === "dark" ? "dark" : "light",
        y: { formatter: (v) => `${v} sessions` },
      },
    };
  }, [theme, attendanceByMonth]);

  return (
    <DashboardCard
      title="Attendance Sessions"
      subtitle={`${new Date().getFullYear()} — ${totalSessions.toLocaleString()} total sessions`}
      icon={<CalenderIcon className="size-5" />}
      iconClassName="bg-amber-500/15 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400"
      actionHref="/attendance"
      loading={loading}
    >
      <div className="min-h-[300px]">
        <ReactApexChart
          options={options}
          series={[{ name: "Sessions", data: attendanceByMonth.map((m) => m.count) }]}
          type="bar"
          height={300}
        />
      </div>
    </DashboardCard>
  );
}
