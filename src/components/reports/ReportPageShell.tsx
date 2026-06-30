"use client";

import React from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { printReport } from "@/lib/report-utils";
import { DownloadIcon } from "@/icons";

type ReportPageShellProps = {
  pageTitle: string;
  children: React.ReactNode;
  onExportCsv?: () => void;
  exportDisabled?: boolean;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export default function ReportPageShell({
  pageTitle,
  children,
  onExportCsv,
  exportDisabled,
  actions,
}: ReportPageShellProps) {
  return (
    <div className="report-print-area">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <PageBreadCrumb pageTitle={pageTitle} />
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {onExportCsv && (
            <Button
              variant="outline"
              size="sm"
              startIcon={<DownloadIcon />}
              onClick={onExportCsv}
              disabled={exportDisabled}
            >
              Export CSV
            </Button>
          )}
          <Button size="sm" onClick={printReport}>
            Print / Save PDF
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
