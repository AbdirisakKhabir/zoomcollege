"use client";

import React from "react";

export default function ReportLoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}
