"use client";

import { useState } from "react";

interface Props {
  reportId: string;
  initialHtml: string;
  initialMarkdown: string;
  meta: {
    period: string;
    priorPeriod: string;
    adsPeriodLabel: string | null;
    cmpLabel: string;
  };
}

export default function ReportClient({ reportId, initialHtml, initialMarkdown, meta }: Props) {
  const [html, setHtml] = useState(initialHtml);
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [narrativeMode, setNarrativeMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rewrite() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/narrative", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: reportId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Narrative rewrite failed (${res.status})`);
      }
      const { html: newHtml, markdown: newMd } = await res.json();
      setHtml(newHtml);
      setMarkdown(newMd);
      setNarrativeMode(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function copyMarkdown() {
    navigator.clipboard.writeText(markdown);
  }

  return (
    <div className="space-y-5">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-4 space-y-1 text-sm">
        <div><span className="text-[var(--text-muted)]">Period:</span> <strong>{meta.period}</strong></div>
        <div><span className="text-[var(--text-muted)]">Prior period:</span> {meta.priorPeriod}</div>
        <div className="text-xs text-[var(--text-muted)]">{meta.cmpLabel}</div>
        {meta.adsPeriodLabel && (
          <div className="text-xs text-[var(--text-muted)]">Google Ads export period: {meta.adsPeriodLabel}</div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={`/report/${reportId}/md`}
          className="px-3 py-1.5 rounded bg-[var(--panel-2)] border border-[var(--border)] text-sm hover:bg-[var(--panel)]"
        >
          Download Markdown
        </a>
        <a
          href={`/report/${reportId}/html`}
          className="px-3 py-1.5 rounded bg-[var(--panel-2)] border border-[var(--border)] text-sm hover:bg-[var(--panel)]"
        >
          Download HTML
        </a>
        <a
          href={`/report/${reportId}/pdf`}
          className="px-3 py-1.5 rounded bg-[var(--panel-2)] border border-[var(--border)] text-sm hover:bg-[var(--panel)]"
        >
          Download PDF
        </a>
        <button
          onClick={copyMarkdown}
          className="px-3 py-1.5 rounded bg-[var(--panel-2)] border border-[var(--border)] text-sm hover:bg-[var(--panel)]"
        >
          Copy Markdown
        </button>
        <button
          onClick={rewrite}
          disabled={busy}
          className="px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm disabled:opacity-50"
        >
          {busy ? "Rewriting…" : narrativeMode ? "Rewrite again" : "Rewrite as narrative (LLM)"}
        </button>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <article
        className="report-prose bg-[var(--panel)] border border-[var(--border)] rounded-lg p-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
