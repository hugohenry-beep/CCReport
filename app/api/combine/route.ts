import { NextRequest, NextResponse } from "next/server";
import {
  extractPriorPeriodMetrics,
  findMatchingPriorSnapshot,
  listSnapshotsInRange,
  saveSnapshot,
} from "@/lib/db/snapshots";
import { combineSnapshotsToMetrics } from "@/lib/metrics/combineSnapshots";
import { findTiling } from "@/lib/metrics/tileSnapshots";

export const runtime = "nodejs";
export const maxDuration = 60;

interface CombineBody {
  snapshotIds?: string[];
  periodStart?: string;
  periodEnd?: string;
  name?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CombineBody;
    const { snapshotIds, periodStart, periodEnd } = body;
    const name =
      typeof body.name === "string" && body.name.trim() !== "" ? body.name.trim() : null;

    if (!Array.isArray(snapshotIds) || snapshotIds.length === 0) {
      return NextResponse.json({ error: "Missing snapshotIds" }, { status: 400 });
    }
    if (typeof periodStart !== "string" || typeof periodEnd !== "string") {
      return NextResponse.json({ error: "Missing periodStart or periodEnd" }, { status: 400 });
    }
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    // Re-validate the tiling server-side so a client can't request an arbitrary
    // combination of snapshots that don't actually cover the range cleanly.
    const candidates = await listSnapshotsInRange({ start, end });
    const filtered = candidates.filter((s) => snapshotIds.includes(s.id));
    if (filtered.length !== snapshotIds.length) {
      return NextResponse.json(
        { error: "One or more snapshots are outside the requested range" },
        { status: 400 },
      );
    }
    const tiling = findTiling(filtered, { start, end });
    if (!tiling || tiling.snapshots.length !== snapshotIds.length) {
      return NextResponse.json(
        { error: "Selected snapshots do not cleanly tile the requested range" },
        { status: 400 },
      );
    }

    const duration = end.getTime() - start.getTime();
    const priorRange = {
      start: new Date(start.getTime() - duration),
      end: start,
    };
    const priorSnapshot = await findMatchingPriorSnapshot(priorRange);
    const prior = priorSnapshot
      ? extractPriorPeriodMetrics(priorSnapshot.metricsJson as unknown)
      : null;

    const metrics = combineSnapshotsToMetrics(
      tiling.snapshots,
      { start, end },
      prior,
      priorRange.start,
      priorRange.end,
      priorSnapshot
        ? {
            id: priorSnapshot.id,
            periodStart: priorSnapshot.periodStart,
            periodEnd: priorSnapshot.periodEnd,
          }
        : null,
    );

    const filesMeta = {
      source: "combined" as const,
      sourceSnapshotIds: tiling.snapshots.map((s) => s.id),
      sourceSnapshots: tiling.snapshots.map((s) => ({
        id: s.id,
        name: s.name,
        periodStart: s.periodStart.toISOString(),
        periodEnd: s.periodEnd.toISOString(),
      })),
    };

    const saved = await saveSnapshot(metrics, filesMeta, name);
    return NextResponse.json({ id: saved.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("combine failed:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
