"use client";

import React from "react";
import Image from "next/image";
import { TRANSCRIPT_BRAND } from "@/lib/transcript-brand";
import { formatPrintedDate } from "@/lib/report-utils";

export type ReportPrintMetaItem = {
  label: string;
  value: React.ReactNode;
};

type ReportPrintHeaderProps = {
  title: string;
  meta?: ReportPrintMetaItem[];
};

export default function ReportPrintHeader({ title, meta = [] }: ReportPrintHeaderProps) {
  const items: ReportPrintMetaItem[] = [
    ...meta,
    { label: "Printed", value: formatPrintedDate() },
  ];

  return (
    <div className="mb-4 hidden print:block">
      <div className="mb-3 flex items-center gap-4 border-b-2 border-gray-800 pb-3">
        <Image
          src={TRANSCRIPT_BRAND.logoUrl}
          alt={TRANSCRIPT_BRAND.universityName}
          width={64}
          height={64}
          className="h-16 w-16 object-contain"
        />
        <div className="flex-1 text-center">
          <p className="text-lg font-bold uppercase tracking-wide text-black">
            {TRANSCRIPT_BRAND.universityName}
          </p>
          <p className="text-sm font-semibold text-black">
            {TRANSCRIPT_BRAND.officeTitle}
          </p>
          <p className="text-xs text-black">{TRANSCRIPT_BRAND.website}</p>
        </div>
        <Image
          src={TRANSCRIPT_BRAND.logoUrl}
          alt={TRANSCRIPT_BRAND.universityName}
          width={64}
          height={64}
          className="h-16 w-16 object-contain"
        />
      </div>
      <div className="mb-3 text-center">
        <p className="text-base font-bold uppercase tracking-widest text-black underline">
          {title}
        </p>
      </div>
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 rounded border border-gray-400 px-4 py-2 text-xs text-black">
          {items.map((item) => (
            <span key={item.label}>
              <strong>{item.label}:</strong> {item.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
