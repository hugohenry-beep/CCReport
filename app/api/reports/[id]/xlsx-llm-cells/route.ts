import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getSnapshot, normalizeStoredMetrics } from "@/lib/db/snapshots";
import { buildPromptInputs } from "@/lib/xlsx-export/llmCellPrompt";
import type { Metrics } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
  }

  const { id } = await ctx.params;
  const snap = await getSnapshot(id);
  if (!snap) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const metrics = normalizeStoredMetrics(snap.metricsJson) ?? (snap.metricsJson as unknown as Metrics);
  const { systemPrompt, schema } = buildPromptInputs(metrics);
  const userPayload = JSON.stringify({ METRICS_JSON: metrics, CELL_SCHEMA: schema });

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPayload },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "OpenAI returned empty content" }, { status: 502 });
  }
  let parsed: Record<string, number | string | null>;
  try {
    parsed = JSON.parse(content) as Record<string, number | string | null>;
  } catch (err) {
    return NextResponse.json(
      { error: "OpenAI returned non-JSON content", raw: content, parseError: String(err) },
      { status: 502 },
    );
  }
  return NextResponse.json({ cells: parsed, schema });
}
