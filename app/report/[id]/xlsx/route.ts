import { NextResponse } from "next/server";
import { getSnapshot, normalizeStoredMetrics } from "@/lib/db/snapshots";
import { renderReportXlsx } from "@/lib/xlsx-export";
import type { Metrics } from "@/lib/types";

export const runtime = "nodejs";

function safeFilename(name: string | null, id: string, periodEnd: Date): string {
  const base = name?.trim() ? name.trim() : `report-${id}`;
  const cleaned = base.replace(/[^a-z0-9\-_. ]/gi, "_").slice(0, 60);
  const date = periodEnd.toISOString().slice(0, 10);
  return `${cleaned}-${date}.xlsx`;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const snap = await getSnapshot(id);
  if (!snap) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const metrics = normalizeStoredMetrics(snap.metricsJson) ?? (snap.metricsJson as unknown as Metrics);
  const buf = await renderReportXlsx(metrics, snap.name);
  const filename = safeFilename(snap.name, id, new Date(metrics.periodEnd));
  const body = new Uint8Array(buf);
  return new NextResponse(body, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
