import { NextRequest, NextResponse } from "next/server";
import { getSnapshot } from "@/lib/db/snapshots";
import { renderTemplatedMarkdown } from "@/lib/render/templated";
import { rewriteAsNarrative } from "@/lib/render/narrative";
import type { Metrics } from "@/lib/types";
import { markdownToHtml } from "@/lib/render/html";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const templated = renderTemplatedMarkdown(metrics);
    const md = await rewriteAsNarrative(templated, metrics);
    const html = await markdownToHtml(md);
    return NextResponse.json({ markdown: md, html });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("narrative failed:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
