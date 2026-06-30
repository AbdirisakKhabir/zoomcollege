"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { DollarLineIcon } from "@/icons";
import { useTheme } from "@/context/ThemeContext";
import { useDashboard } from "./DashboardContext";
import DashboardCard from "./DashboardCard";
import { getBaseChartOptions } from "./chartTheme";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function RevenueChart() {
  const { theme } = useTheme();
  const { data, loading } = useDashboard();

  const revenueByMonth = data?.chartData.revenueByMonth ?? [];
  const admissionsByMonth = data?.chartData.admissionsByMonth ?? [];

  const totalRevenue = revenueByMonth.reduce((s, m) => s + m.total, 0);
  const currentMonth = new Date().getMonth();
  const thisMonthRevenue = revenueByMonth[currentMonth]?.total ?? 0;
  const lastMonthRevenue = currentMonth > 0 ? revenueByMonth[currentMonth - 1]?.total ?? 0 : 0;
  const revenueChange =
    lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null;

  const options: ApexOptions = useMemo(() => {
    const base = getBaseChartOptions(theme);
    return {
      ...base,
      colors: ["#465FFF", "#10B981"],
      stroke: { curve: "smooth", width: [3, 2] },
      fill: {
        type: ["gradient", "solid"],
        gradient: { opacityFrom: 0.35, opacityTo: 0.02 },
        opacity: [1, 0.15],
      },
      dataLabels: { enabled: false },
      xaxis: {
        ...base.xaxis,
        categories: revenueByMonth.map((m) => m.month),
      },
      yaxis: [
        {
          labels: {
            style: { colors: theme === "dark" ? "#9CA3AF" : "#6B7280", fontSize: "12px" },
            formatter: (v) => `$${Number(v).toLocaleString()}`,
          },
        },
        {
          opposite: true,
          labels: {
            style: { colors: theme === "dark" ? "#9CA3AF" : "#6B7280", fontSize: "12px" },
            formatter: (v) => Math.round(Number(v)).toString(),
          },
        },
      ],
      legend: {
        position: "top",
        horizontalAlign: "right",
        labels: { colors: theme === "dark" ? "#9CA3AF" : "#6B7280" },
      },
      tooltip: {
        theme: theme === "dark" ? "dark" : "light",
        shared: true,
        y: [
          { formatter: (v) => `$${Number(v).toLocaleString()}` },
          { formatter: (v) => `${v} students` },
        ],
      },
    };
  }, [theme, revenueByMonth]);

  const series = [
    { name: "Revenue", type: "area" as const, data: revenueByMonth.map((m) => m.total) },
    { name: "Admissions", type: "line" as const, data: admissionsByMonth.map((m) => m.count) },
  ];

  return (
    <DashboardCard
      title="Tuition Revenue & Admissions"
      subtitle={`${new Date().getFullYear()} overview`}
      icon={<DollarLineIcon className="size-5" />}
      iconClassName="bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400"
      actionHref="/finance/collect-monthly-fee"
      loading={loading}
      headerExtra={
        !loading && (
          <div className="hidden text-right sm:block">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ${totalRevenue.toLocaleString()}
            </p>
            {revenueChange !== null && (
              <p
                className={`text-xs font-medium ${revenueChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
              >
                {revenueChange >= 0 ? "+" : ""}
                {revenueChange}% vs last month
              </p>
            )}
          </div>
        )
      }
    >
      <div className="min-h-[300px]">
        {revenueByMonth.length > 0 ? (
          <ReactApexChart options={options} series={series} type="line" height={300} />
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
            No revenue data yet.
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
