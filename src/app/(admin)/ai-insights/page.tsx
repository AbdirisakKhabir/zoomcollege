"use client";

import React, { useCallback, useEffect, useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import ReportDateRangeFilter from "@/components/reports/ReportDateRangeFilter";
import Button from "@/components/ui/button/Button";
import { useReportDateRange } from "@/hooks/useReportDateRange";
import { formatReportDateRange } from "@/lib/report-date-range";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart3,
  BookOpen,
  Brain,
  ClipboardList,
  DollarSign,
  GraduationCap,
  Sparkles,
  Users,
} from "lucide-react";

type AiTopic = "overview" | "finance" | "admission" | "attendance" | "examinations";

const TOPICS: {
  id: AiTopic;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Enrollment, finance, attendance, and exams together",
    icon: <BarChart3 className="h-5 w-5" strokeWidth={1.75} />,
  },
  {
    id: "finance",
    label: "Finance",
    description: "Revenue, balances, bank accounts, unpaid students",
    icon: <DollarSign className="h-5 w-5" strokeWidth={1.75} />,
  },
  {
    id: "admission",
    label: "Admission",
    description: "Student counts, status breakdown, cases",
    icon: <Users className="h-5 w-5" strokeWidth={1.75} />,
  },
  {
    id: "attendance",
    label: "Attendance",
    description: "Sessions, absence rates, engagement trends",
    icon: <ClipboardList className="h-5 w-5" strokeWidth={1.75} />,
  },
  {
    id: "examinations",
    label: "Examinations",
    description: "Grades, GPA averages, academic performance",
    icon: <GraduationCap className="h-5 w-5" strokeWidth={1.75} />,
  },
];

function renderMarkdownLite(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("### ")) {
      return (
        <h3 key={i} className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
          {line.slice(4)}
        </h3>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2 key={i} className="mt-5 text-base font-semibold text-gray-900 dark:text-white">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h1 key={i} className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          {line.slice(2)}
        </h1>
      );
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <li key={i} className="ml-4 list-disc text-sm text-gray-700 dark:text-gray-300">
          {line.slice(2)}
        </li>
      );
    }
    if (!line.trim()) {
      return <div key={i} className="h-2" />;
    }
    return (
      <p key={i} className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {line}
      </p>
    );
  });
}

export default function AiInsightsPage() {
  const { hasPermission } = useAuth();
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useReportDateRange("year");
  const [topic, setTopic] = useState<AiTopic>("overview");
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);

  const canView =
    hasPermission("reports.view") ||
    hasPermission("dashboard.view") ||
    hasPermission("admin");

  useEffect(() => {
    authFetch("/api/ai/analyze")
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.configured)))
      .catch(() => setConfigured(false));
  }, []);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError("");
    setAnalysis("");
    try {
      const res = await authFetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          dateFrom,
          dateTo,
          question: question.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Analysis failed");
        return;
      }
      setAnalysis(data.analysis ?? "");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [topic, dateFrom, dateTo, question]);

  if (!canView) {
    return (
      <div>
        <PageBreadCrumb pageTitle="AI Insights" />
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-white/5">
          <p className="text-gray-500 dark:text-gray-400">
            You do not have permission to view AI Insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadCrumb pageTitle="AI Insights" />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-brand-500" strokeWidth={1.75} />
            AI Data Analysis
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Analyze live data from your system — students, finance, attendance, and exams — with
            AI-generated insights and recommendations.
          </p>
        </div>
        {configured === false && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100">
            Add <code className="font-mono text-xs">OPENAI_API_KEY</code> to server{" "}
            <code className="font-mono text-xs">.env</code> and restart the app.
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTopic(t.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              topic === t.id
                ? "border-brand-500 bg-brand-50/80 shadow-sm dark:border-brand-500/50 dark:bg-brand-500/10"
                : "border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-white/3 dark:hover:border-brand-500/30"
            }`}
          >
            <div
              className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${
                topic === t.id
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {t.icon}
            </div>
            <div className="font-medium text-gray-900 dark:text-white">{t.label}</div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
          </button>
        ))}
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <ReportDateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Optional question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Which department has the most unpaid students?"
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-700 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-gray-300"
            />
          </div>
          <Button
            onClick={() => void runAnalysis()}
            disabled={loading || configured === false}
            startIcon={loading ? undefined : <Brain className="h-4 w-4" strokeWidth={1.75} />}
          >
            {loading ? "Analyzing…" : "Analyze data"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Period: {formatReportDateRange(dateFrom, dateTo)}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-white/3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Reading your data and generating insights…
          </p>
        </div>
      )}

      {!loading && analysis && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
            <BookOpen className="h-5 w-5 text-brand-500" strokeWidth={1.75} />
            <h2 className="font-semibold text-gray-900 dark:text-white">Analysis report</h2>
          </div>
          <div className="space-y-1">{renderMarkdownLite(analysis)}</div>
        </div>
      )}

      {!loading && !analysis && !error && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-14 text-center dark:border-gray-800 dark:bg-white/2">
          <Sparkles className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Choose a topic and click <strong>Analyze data</strong> to get AI insights.
          </p>
        </div>
      )}
    </div>
  );
}
