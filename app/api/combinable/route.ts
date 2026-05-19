import { NextRequest, NextResponse } from "next/server";
import { listSnapshotsInRange } from "@/lib/db/snapshots";
import { findTiling } from "@/lib/metrics/tileSnapshots";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const startStr = url.searchParams.get("start");
    const endStr = url.searchParams.get("end");
    if (!startStr || !endStr) {
      return NextResponse.json({ error: "Missing start or end" }, { status: 400 });
    }
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const candidates = await listSnapshotsInRange({ start, end });
    const tiling = findTiling(candidates, { start, end });
    if (!tiling) return NextResponse.json({ tiling: null });

    return NextResponse.json({
      tiling: {
        snapshots: tiling.snapshots.map((s) => ({
          id: s.id,
          name: s.name,
          periodStart: s.periodStart.toISOString(),
          periodEnd: s.periodEnd.toISOString(),
        })),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
