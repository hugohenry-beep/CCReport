import type { Metrics, PeriodMetrics } from "../types";
import { prisma } from "./client";

export async function saveSnapshot(metrics: Metrics, filesMeta: unknown, name?: string | null) {
  return prisma.reportSnapshot.create({
    data: {
      name: name ?? null,
      periodStart: new Date(metrics.periodStart),
      periodEnd: new Date(metrics.periodEnd),
      metricsJson: metrics as unknown as object,
      filesMeta: filesMeta as object,
    },
  });
}

export async function getSnapshot(id: string) {
  return prisma.reportSnapshot.findUnique({ where: { id } });
}

export async function updateSnapshot(id: string, data: { name: string | null }) {
  return prisma.reportSnapshot.update({
    where: { id },
    data: { name: data.name },
  });
}

export async function deleteSnapshot(id: string) {
  return prisma.reportSnapshot.delete({ where: { id } });
}

export async function findPriorSnapshot(currentPeriodStart: Date) {
  return prisma.reportSnapshot.findFirst({
    where: { periodEnd: { lte: currentPeriodStart } },
    orderBy: { periodEnd: "desc" },
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface MatchingPriorSnapshotOptions {
  toleranceDays?: number;
  excludeId?: string;
}

/**
 * Find a stored report whose period closely matches the expected prior range.
 * Both periodStart and periodEnd must fall within ±toleranceDays of the
 * corresponding edge of priorRange. When several candidates qualify, the one
 * whose edges are collectively closest to priorRange wins; ties break to the
 * most recently created snapshot.
 */
export async function findMatchingPriorSnapshot(
  priorRange: { start: Date; end: Date },
  opts: MatchingPriorSnapshotOptions = {},
) {
  const toleranceDays = opts.toleranceDays ?? 2;
  const tolMs = toleranceDays * DAY_MS;
  const startLo = new Date(priorRange.start.getTime() - tolMs);
  const startHi = new Date(priorRange.start.getTime() + tolMs);
  const endLo = new Date(priorRange.end.getTime() - tolMs);
  const endHi = new Date(priorRange.end.getTime() + tolMs);

  const candidates = await prisma.reportSnapshot.findMany({
    where: {
      periodStart: { gte: startLo, lte: startHi },
      periodEnd: { gte: endLo, lte: endHi },
      ...(opts.excludeId ? { NOT: { id: opts.excludeId } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (candidates.length === 0) return null;

  const scored = candidates.map((s) => {
    const startDiff = Math.abs(s.periodStart.getTime() - priorRange.start.getTime());
    const endDiff = Math.abs(s.periodEnd.getTime() - priorRange.end.getTime());
    return { snapshot: s, diff: startDiff + endDiff };
  });
  scored.sort((a, b) => a.diff - b.diff);
  return scored[0].snapshot;
}

export async function listRecentSnapshots(limit = 20) {
  return prisma.reportSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Older snapshots stored `costPerLead` as adSpend / inboundLeadCount (blended
 * across organic + paid leads), while `paidSearchCostPerLead` was already the
 * paid-only figure used in the written report. Rewrite the field at read time
 * so every surface (dashboard tiles, charts, markdown, PDF) sees one number.
 */
function normalizePeriodMetrics(p: PeriodMetrics): PeriodMetrics {
  if (p.paidSearchCostPerLead != null && p.costPerLead !== p.paidSearchCostPerLead) {
    return { ...p, costPerLead: p.paidSearchCostPerLead };
  }
  return p;
}

export function normalizeStoredMetrics(metricsJson: unknown): Metrics | null {
  if (!metricsJson || typeof metricsJson !== "object") return null;
  const m = metricsJson as Metrics;
  if (!m.current) return m;
  const current = normalizePeriodMetrics(m.current);
  const prior = m.prior ? normalizePeriodMetrics(m.prior) : null;
  if (current === m.current && prior === m.prior) return m;
  return { ...m, current, prior };
}

export function extractPriorPeriodMetrics(metricsJson: unknown): PeriodMetrics | null {
  const m = normalizeStoredMetrics(metricsJson);
  return m?.current ?? null;
}
