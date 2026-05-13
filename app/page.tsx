import { listRecentSnapshots } from "@/lib/db/snapshots";
import type { Metrics } from "@/lib/types";
import UploadForm from "./UploadForm";
import RecentReports, { type RecentReportItem } from "./RecentReports";
import { AlertCircle, ArrowDown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let items: RecentReportItem[] = [];
  let dbError: string | null = null;
  try {
    const recent = await listRecentSnapshots(50);
    items = recent.map((s) => {
      const m = s.metricsJson as unknown as Metrics | null;
      return {
        id: s.id,
        name: s.name,
        periodStart: s.periodStart.toISOString(),
        periodEnd: s.periodEnd.toISOString(),
        createdAt: s.createdAt.toISOString(),
        leads: m?.current?.inboundLeadCount ?? null,
        spend: m?.current?.adSpend ?? null,
        pipeline: m?.current?.totalDealValue ?? null,
        priorLeads: m?.prior?.inboundLeadCount ?? null,
        warningCount: m?.warnings?.length ?? 0,
      };
    });
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <section className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-start">
        <div className="space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Generate a new report
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed max-w-prose">
            Drop in your HubSpot dashboard export (zip or individual xlsx files) plus the
            Google Ads <span className="text-text">Campaign report</span>. Pick a timeframe and
            the app derives metrics, compares against the prior period, and produces a
            downloadable report in Markdown, HTML, PDF, or Excel.
          </p>
          <ul className="text-sm text-text-muted space-y-1.5 pt-1">
            <li className="flex gap-2">
              <span className="text-accent">·</span>
              File kinds are detected by filename — chips below the dropzone show what was recognized.
            </li>
            <li className="flex gap-2">
              <span className="text-accent">·</span>
              Each generated report is persisted so subsequent runs auto-compare against the prior period.
            </li>
            <li className="flex gap-2">
              <span className="text-accent">·</span>
              Toggle between a chart-rich <span className="text-text">Report</span> view and an email-friendly <span className="text-text">Written</span> summary.
            </li>
          </ul>
        </div>
        <UploadForm />
      </section>

      <section>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Recent reports</h2>
            <p className="text-sm text-text-muted">Click a row to open. Use the menu to rename or delete.</p>
          </div>
        </div>
        {dbError ? (
          <div className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Database not reachable: {dbError}. Set <code className="font-mono text-xs">DATABASE_URL</code> and run{" "}
              <code className="font-mono text-xs">npm run db:migrate:dev</code>.
            </span>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface/40 p-8 text-center">
            <ArrowDown className="mx-auto h-5 w-5 text-text-subtle animate-bounce" aria-hidden />
            <p className="mt-2 text-sm text-text-muted">
              No reports yet. Generate your first one using the form above.
            </p>
          </div>
        ) : (
          <RecentReports initial={items} />
        )}
      </section>
    </div>
  );
}
