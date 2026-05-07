"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState<string>("");
  const [periodStart, setPeriodStart] = useState<string>(defaultStart());
  const [periodEnd, setPeriodEnd] = useState<string>(defaultEnd());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(e.target.files ?? []));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (files.length === 0) {
      setError("Please add at least one file.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("periodStart", new Date(periodStart).toISOString());
      // Treat end date as end-of-day so the entire selected day is included.
      const endDate = new Date(periodEnd);
      endDate.setHours(23, 59, 59, 999);
      fd.set("periodEnd", endDate.toISOString());
      if (name.trim() !== "") fd.set("name", name.trim());
      files.forEach((f, i) => fd.append(`file_${i}`, f));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }
      const { id } = await res.json();
      router.push(`/report/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 bg-[var(--panel)] border border-[var(--border)] rounded-lg p-5"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Files (zip or .xlsx, multiple allowed)</label>
        <input
          type="file"
          multiple
          accept=".zip,.xlsx"
          onChange={onFilesChange}
          className="block w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-[var(--accent)] file:text-white file:cursor-pointer"
        />
        {files.length > 0 && (
          <ul className="mt-2 text-xs text-[var(--text-muted)] space-y-0.5">
            {files.map((f) => (
              <li key={f.name}>• {f.name} ({Math.round(f.size / 1024)} KB)</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Report name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Q1 2026 paid pipeline"
          className="w-full px-3 py-2 rounded bg-[var(--panel-2)] border border-[var(--border)] text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Period start</label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--panel-2)] border border-[var(--border)] text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Period end</label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--panel-2)] border border-[var(--border)] text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="px-4 py-2 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "Generating…" : "Generate report"}
      </button>
    </form>
  );
}

function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function defaultEnd(): string {
  return new Date().toISOString().slice(0, 10);
}
