import { listRecentSnapshots } from "@/lib/db/snapshots";
import UploadForm from "./UploadForm";
import ReportListItem from "./ReportListItem";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let recent: Awaited<ReturnType<typeof listRecentSnapshots>> = [];
  let dbError: string | null = null;
  try {
    recent = await listRecentSnapshots(10);
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold mb-2">Generate a new report</h1>
        <p className="text-[var(--text-muted)] mb-4 text-sm">
          Upload your HubSpot dashboard export (zip or individual xlsx files) plus the Google Ads Campaign report xlsx.
          Pick the timeframe you want to analyze. The app will derive metrics, compare against the prior period, and
          let you download Markdown, HTML, and PDF versions of the written report.
        </p>
        <UploadForm />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Recent reports</h2>
        {dbError ? (
          <p className="text-sm text-[var(--warning)]">
            Database not reachable: {dbError}. Set <code>DATABASE_URL</code> and run{" "}
            <code>npm run db:migrate:dev</code>.
          </p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No reports yet. Generate one above.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-md overflow-hidden bg-[var(--panel)]">
            {recent.map((s) => (
              <ReportListItem
                key={s.id}
                id={s.id}
                name={s.name}
                periodStart={s.periodStart.toISOString()}
                periodEnd={s.periodEnd.toISOString()}
                createdAt={s.createdAt.toISOString()}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
