import { NextRequest, NextResponse } from "next/server";
import { parseAll } from "@/lib/parsers";
import type { NamedFile } from "@/lib/parsers/unzip";
import { compute } from "@/lib/metrics/compute";
import { extractPriorPeriodMetrics, findPriorSnapshot, saveSnapshot } from "@/lib/db/snapshots";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const startStr = form.get("periodStart");
    const endStr = form.get("periodEnd");
    if (typeof startStr !== "string" || typeof endStr !== "string") {
      return NextResponse.json({ error: "Missing periodStart or periodEnd" }, { status: 400 });
    }
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const namedFiles: NamedFile[] = [];
    for (const [, value] of form.entries()) {
      if (value instanceof File) {
        const buf = Buffer.from(await value.arrayBuffer());
        namedFiles.push({ name: value.name, buffer: buf });
      }
    }

    if (namedFiles.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const datasets = parseAll(namedFiles);

    const priorSnapshot = await findPriorSnapshot(start);
    const priorMetrics = priorSnapshot
      ? extractPriorPeriodMetrics(priorSnapshot.metricsJson as unknown)
      : null;

    const metrics = compute(datasets, {
      range: { start, end },
      priorSnapshotMetrics: priorMetrics,
      priorSnapshot: priorSnapshot
        ? {
            id: priorSnapshot.id,
            periodStart: priorSnapshot.periodStart,
            periodEnd: priorSnapshot.periodEnd,
          }
        : null,
    });

    const saved = await saveSnapshot(metrics, datasets.files);

    return NextResponse.json({ id: saved.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("upload failed:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
