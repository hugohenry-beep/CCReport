"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { fmtDateRange } from "@/lib/render/format";

interface Props {
  id: string;
  name: string | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export default function ReportListItem({ id, name, periodStart, periodEnd, createdAt }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: draft }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Rename failed (${res.status})`);
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete this report (${fmtDateRange(periodStart, periodEnd)})? This cannot be undone.`)) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Delete failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <li className="px-4 py-3 hover:bg-[var(--panel-2)]">
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Report name"
            className="flex-1 px-2 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)] text-sm"
            autoFocus
          />
          <button
            onClick={save}
            disabled={busy}
            className="px-2 py-1 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setDraft(name ?? "");
              setError(null);
            }}
            disabled={busy}
            className="px-2 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)] text-xs"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <Link href={`/report/${id}`} className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {name ?? <span className="text-[var(--text-muted)] italic">Unnamed report</span>}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {fmtDateRange(periodStart, periodEnd)} · Generated {new Date(createdAt).toLocaleString()}
            </div>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditing(true)}
              disabled={busy}
              className="px-2 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)] text-xs hover:bg-[var(--panel)]"
            >
              Rename
            </button>
            <button
              onClick={remove}
              disabled={busy}
              className="px-2 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)] text-xs text-[var(--danger)] hover:bg-[var(--panel)]"
            >
              {busy ? "…" : "Delete"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
    </li>
  );
}
