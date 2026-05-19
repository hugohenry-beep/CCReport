import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  extractPriorPeriodMetrics,
  findMatchingPriorSnapshot,
  getSnapshot,
  normalizeStoredMetrics,
} from "@/lib/db/snapshots";
import { applyPriorToMetrics } from "@/lib/metrics/compute";
import type { ComparisonInfo, Metrics } from "@/lib/types";

export const runtime = "nodejs";

function isRecordNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const snap = await getSnapshot(id);
    if (!snap) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const metrics =
      normalizeStoredMetrics(snap.metricsJson) ?? (snap.metricsJson as unknown as Metrics);
    const duration = snap.periodEnd.getTime() - snap.periodStart.getTime();
    const priorRange = {
      start: new Date(snap.periodStart.getTime() - duration),
      end: snap.periodStart,
    };

    const match = await findMatchingPriorSnapshot(priorRange, { excludeId: id });
    if (!match) {
      return NextResponse.json({
        matched: false,
        priorPeriodStart: priorRange.start.toISOString(),
        priorPeriodEnd: priorRange.end.toISOString(),
      });
    }

    const priorMetrics = extractPriorPeriodMetrics(match.metricsJson as unknown);
    if (!priorMetrics) {
      return NextResponse.json({
        matched: false,
        reason: "matching_snapshot_has_no_current_metrics",
        snapshotId: match.id,
      });
    }

    const comparisonInfo: ComparisonInfo = {
      source: "stored_snapshot",
      snapshotId: match.id,
      snapshotPeriodStart: match.periodStart.toISOString(),
      snapshotPeriodEnd: match.periodEnd.toISOString(),
    };

    const next = applyPriorToMetrics(metrics, priorMetrics, comparisonInfo);

    await prisma.reportSnapshot.update({
      where: { id },
      data: { metricsJson: next as unknown as object },
    });

    return NextResponse.json({
      matched: true,
      snapshotId: match.id,
      snapshotPeriodStart: match.periodStart.toISOString(),
      snapshotPeriodEnd: match.periodEnd.toISOString(),
    });
  } catch (err) {
    if (isRecordNotFound(err)) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
