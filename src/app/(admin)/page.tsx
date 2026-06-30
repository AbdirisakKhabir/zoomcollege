import type { Metadata } from "next";
import React from "react";
import DashboardContent from "@/components/dashboard/DashboardContent";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";

import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Dashboard"),
  description: `${BRAND.name} Dashboard`,
};

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
