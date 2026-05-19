import { NextResponse } from "next/server";
import { getSnapshot, normalizeStoredMetrics } from "@/lib/db/snapshots";
import { renderReportPdf } from "@/lib/render/pdf";
import type { Metrics } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const snap = await getSnapshot(id);
  if (!snap) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const metrics = normalizeStoredMetrics(snap.metricsJson) ?? (snap.metricsJson as unknown as Metrics);
  const buf = await renderReportPdf(metrics);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="report-${id}.pdf"`,
    },
  });
}
