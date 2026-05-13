"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "./components/ui/Input";
import ReportListItem from "./ReportListItem";

export interface RecentReportItem {
  id: string;
  name: string | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  leads: number | null;
  spend: number | null;
  pipeline: number | null;
  priorLeads: number | null;
  warningCount: number;
}

const PAGE_SIZE = 10;

export default function RecentReports({ initial }: { initial: RecentReportItem[] }) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initial;
    return initial.filter((r) => {
      const hay = `${r.name ?? ""} ${r.periodStart} ${r.periodEnd}`.toLowerCase();
      return hay.includes(q);
    });
  }, [initial, query]);

  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > shown.length;

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search by name or date…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(PAGE_SIZE);
          }}
          className="pl-8"
          aria-label="Search reports"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted py-6 text-center">
          No reports match <span className="text-text">&ldquo;{query}&rdquo;</span>.
        </p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-surface shadow-soft">
          {shown.map((s) => (
            <ReportListItem key={s.id} {...s} />
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="text-sm text-accent hover:underline underline-offset-4"
          >
            Load {Math.min(PAGE_SIZE, filtered.length - shown.length)} more
          </button>
        </div>
      )}
    </div>
  );
}
