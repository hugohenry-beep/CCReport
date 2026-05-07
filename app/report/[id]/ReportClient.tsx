"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  reportId: string;
  initialHtml: string;
  initialMarkdown: string;
  initialName: string | null;
  meta: {
    period: string;
    priorPeriod: string;
    adsPeriodLabel: string | null;
    cmpLabel: string;
  };
}

export default function ReportClient({ reportId, initialHtml, initialMarkdown, initialName, meta }: Props) {
  const router = useRouter();
  const [html, setHtml] = useState(initialHtml);
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [name, setName] = useState<string | null>(initialName);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(initialName ?? "");
  const [narrativeMode, setNarrativeMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveName() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nameDraft }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Rename failed (${res.status})`);
      }
      const updated = await res.json();
      setName(updated.name);
      setEditingName(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Delete failed (${res.status})`);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

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
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-4 space-y-2 text-sm">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Report name"
              className="flex-1 px-2 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)] text-sm"
              autoFocus
            />
            <button
              onClick={saveName}
              disabled={busy}
              className="px-2 py-1 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingName(false);
                setNameDraft(name ?? "");
              }}
              disabled={busy}
              className="px-2 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)] text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold">
              {name ?? <span className="text-[var(--text-muted)] italic font-normal">Unnamed report</span>}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setNameDraft(name ?? "");
                  setEditingName(true);
                }}
                className="px-2 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)] text-xs hover:bg-[var(--panel)]"
              >
                Rename
              </button>
              <button
                onClick={remove}
                disabled={busy}
                className="px-2 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)] text-xs text-[var(--danger)] hover:bg-[var(--panel)]"
              >
                Delete
              </button>
            </div>
          </div>
        )}
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
