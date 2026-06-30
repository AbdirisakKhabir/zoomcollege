import { NextRequest, NextResponse } from "next/server";
import {
  buildAnalyticsSnapshot,
  type AiAnalysisTopic,
} from "@/lib/ai-analytics-data";
import { generateAiAnalysis, isAiConfigured } from "@/lib/ai-client";
import { loadAuthContext } from "@/lib/department-access";
import { defaultReportDateRange } from "@/lib/report-date-range";

const VALID_TOPICS = new Set<AiAnalysisTopic>([
  "overview",
  "finance",
  "admission",
  "attendance",
  "examinations",
]);

function hasAiAccess(permissions: string[], isSuperAdmin: boolean): boolean {
  if (isSuperAdmin) return true;
  return (
    permissions.includes("reports.view") ||
    permissions.includes("dashboard.view") ||
    permissions.includes("admin") ||
    permissions.includes("*")
  );
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await loadAuthContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAiAccess(ctx.permissions, ctx.isSuperAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isAiConfigured()) {
      return NextResponse.json(
        {
          error:
            "AI is not configured. Add OPENAI_API_KEY to your server .env file and restart the app.",
          configured: false,
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const topic = (body.topic ?? "overview") as AiAnalysisTopic;
    const defaults = defaultReportDateRange("year");
    const dateFrom = typeof body.dateFrom === "string" ? body.dateFrom : defaults.dateFrom;
    const dateTo = typeof body.dateTo === "string" ? body.dateTo : defaults.dateTo;
    const question = typeof body.question === "string" ? body.question : undefined;

    if (!VALID_TOPICS.has(topic)) {
      return NextResponse.json({ error: "Invalid analysis topic" }, { status: 400 });
    }

    const snapshot = await buildAnalyticsSnapshot(ctx, topic, dateFrom, dateTo);
    const analysis = await generateAiAnalysis(snapshot, question);

    return NextResponse.json({
      analysis,
      snapshot,
      configured: true,
    });
  } catch (e) {
    console.error("AI analyze error:", e);
    const message = e instanceof Error ? e.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const ctx = await loadAuthContext(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    configured: isAiConfigured(),
    topics: ["overview", "finance", "admission", "attendance", "examinations"],
  });
}
