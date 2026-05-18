import { NextRequest, NextResponse } from "next/server";
import { parseAll } from "@/lib/parsers";
import type { NamedFile } from "@/lib/parsers/unzip";
import { compute } from "@/lib/metrics/compute";
import { extractPriorPeriodMetrics, findMatchingPriorSnapshot, saveSnapshot } from "@/lib/db/snapshots";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const startStr = form.get("periodStart");
    const endStr = form.get("periodEnd");
    const nameRaw = form.get("name");
    const name =
      typeof nameRaw === "string" && nameRaw.trim() !== "" ? nameRaw.trim() : null;
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
      // Avoid `instanceof File` — `File` is not a global on Node < 20.
      // Duck-type instead: anything that's not a string and has `arrayBuffer()` is a Blob/File.
      if (typeof value === "string") continue;
      if (value && typeof (value as Blob).arrayBuffer === "function") {
        const buf = Buffer.from(await (value as Blob).arrayBuffer());
        const name = (value as Blob & { name?: string }).name ?? "uploaded.xlsx";
        namedFiles.push({ name, buffer: buf });
      }
    }

    if (namedFiles.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const datasets = parseAll(namedFiles);

    const duration = end.getTime() - start.getTime();
    const priorRange = {
      start: new Date(start.getTime() - duration),
      end: start,
    };
    const priorSnapshot = await findMatchingPriorSnapshot(priorRange);
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

    const saved = await saveSnapshot(metrics, datasets.files, name);

    return NextResponse.json({ id: saved.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("upload failed:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
