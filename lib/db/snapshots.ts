import type { Metrics, PeriodMetrics } from "../types";
import { prisma } from "./client";

export async function saveSnapshot(metrics: Metrics, filesMeta: unknown) {
  return prisma.reportSnapshot.create({
    data: {
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

export async function findPriorSnapshot(currentPeriodStart: Date) {
  return prisma.reportSnapshot.findFirst({
    where: { periodEnd: { lte: currentPeriodStart } },
    orderBy: { periodEnd: "desc" },
  });
}

export async function listRecentSnapshots(limit = 20) {
  return prisma.reportSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function extractPriorPeriodMetrics(metricsJson: unknown): PeriodMetrics | null {
  if (!metricsJson || typeof metricsJson !== "object") return null;
  const m = metricsJson as Partial<Metrics>;
  return m.current ?? null;
}
