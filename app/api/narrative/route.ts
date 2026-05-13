import { NextRequest, NextResponse } from "next/server";
import { getSnapshot } from "@/lib/db/snapshots";
import { renderExecutiveBriefing } from "@/lib/render/executive";
import { enhanceExecutiveNarrative } from "@/lib/render/narrative";
import type { Metrics } from "@/lib/types";
import { markdownToHtml } from "@/lib/render/html";

export const runtime = "nodejs";
export const maxDuration = 60;

const LLM_MARKER_RE = /<!--\s*\/?LLM:[A-Z_]+\s*-->/g;

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (typeof id !== "string") {
      return NextResponse.json({ error: "Missing report id" }, { status: 400 });
    }
    const snap = await getSnapshot(id);
    if (!snap) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const metrics = snap.metricsJson as unknown as Metrics;
    const { markdown: programmatic, facts } = renderExecutiveBriefing(metrics);
    const enhanced = await enhanceExecutiveNarrative(programmatic, facts, metrics);
    const cleaned = enhanced.replace(LLM_MARKER_RE, "").replace(/\n{3,}/g, "\n\n").trim();
    const html = await markdownToHtml(cleaned);
    return NextResponse.json({ markdown: cleaned, html });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("narrative failed:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
