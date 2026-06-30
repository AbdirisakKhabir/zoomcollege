import type { AiAnalysisTopic, AnalyticsSnapshot } from "@/lib/ai-analytics-data";

const TOPIC_LABELS: Record<AiAnalysisTopic, string> = {
  overview: "full institutional overview",
  finance: "finance and payments",
  admission: "admissions and enrollment",
  attendance: "attendance patterns",
  examinations: "examination performance",
};

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function generateAiAnalysis(
  snapshot: AnalyticsSnapshot,
  customQuestion?: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const topicLabel = TOPIC_LABELS[snapshot.topic];

  const systemPrompt = `You are an expert analyst for a university/college management system.
Analyze the provided JSON data and write clear, actionable insights for administrators.
Use markdown with short headings and bullet points.
Highlight risks, trends, and recommendations.
Use dollar amounts with $ prefix. Be concise but specific with numbers from the data.
Do not invent data that is not in the JSON.`;

  const userPrompt = customQuestion?.trim()
    ? `Focus: ${customQuestion.trim()}\n\nTopic area: ${topicLabel}\nPeriod: ${snapshot.dateRange.from} to ${snapshot.dateRange.to}\n\nData:\n${JSON.stringify(snapshot.summary, null, 2)}`
    : `Analyze this ${topicLabel} data for the period ${snapshot.dateRange.from} to ${snapshot.dateRange.to}.\n\nData:\n${JSON.stringify(snapshot.summary, null, 2)}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI returned an empty response.");
  }

  return content;
}
