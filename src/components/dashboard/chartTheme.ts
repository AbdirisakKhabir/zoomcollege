import { ApexOptions } from "apexcharts";

export function getBaseChartOptions(theme: "light" | "dark"): ApexOptions {
  const isDark = theme === "dark";
  const textColor = isDark ? "#9CA3AF" : "#6B7280";
  const gridColor = isDark ? "#374151" : "#F3F4F6";
  const tooltipTheme = isDark ? "dark" : "light";

  return {
    chart: {
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent",
    },
    theme: { mode: theme },
    grid: {
      borderColor: gridColor,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: textColor, fontSize: "12px" } },
    },
    yaxis: {
      labels: { style: { colors: textColor, fontSize: "12px" } },
    },
    tooltip: { theme: tooltipTheme },
    legend: {
      labels: { colors: textColor },
    },
  };
}
