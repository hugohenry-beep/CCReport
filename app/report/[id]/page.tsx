import { notFound } from "next/navigation";
import { getSnapshot } from "@/lib/db/snapshots";
import { renderTemplatedMarkdown } from "@/lib/render/templated";
import { markdownToHtml } from "@/lib/render/html";
import type { Metrics } from "@/lib/types";
import { fmtDateRange } from "@/lib/render/format";
import ReportClient from "./ReportClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snap = await getSnapshot(id);
  if (!snap) return { title: "Report not found" };
  return { title: snap.name ?? "Untitled report" };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snap = await getSnapshot(id);
  if (!snap) return notFound();
  const metrics = snap.metricsJson as unknown as Metrics;
  const md = renderTemplatedMarkdown(metrics);
  const html = await markdownToHtml(md);

  const cmpLabel =
    metrics.comparisonInfo.source === "current_upload"
      ? "Comparison derived from this upload"
      : metrics.comparisonInfo.source === "stored_snapshot"
      ? `Comparison: stored snapshot (${fmtDateRange(metrics.comparisonInfo.snapshotPeriodStart!, metrics.comparisonInfo.snapshotPeriodEnd!)})`
      : "No prior data available for comparison";

  return (
    <ReportClient
      reportId={id}
      initialHtml={html}
      initialMarkdown={md}
      initialName={snap.name}
      metrics={metrics}
      meta={{
        period: fmtDateRange(metrics.periodStart, metrics.periodEnd),
        priorPeriod: fmtDateRange(metrics.priorPeriodStart, metrics.priorPeriodEnd),
        adsPeriodLabel: metrics.adsPeriodLabel,
        cmpLabel,
        warnings: metrics.warnings ?? [],
      }}
    />
  );
}
