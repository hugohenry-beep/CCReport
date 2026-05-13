"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CloudUpload,
  FileSpreadsheet,
  FileArchive,
  FileQuestion,
  X,
} from "lucide-react";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";
import { Label } from "./components/ui/Label";
import { Badge } from "./components/ui/Badge";
import { Spinner } from "./components/ui/Spinner";
import {
  DATE_RANGE_PRESETS,
  defaultRange,
  matchPreset,
  toDateInput,
} from "@/lib/dateRangePresets";
import {
  FILE_KIND_LABEL,
  classifyClient,
  fileKindVariant,
} from "@/lib/classifyClient";
import { cn } from "@/lib/cn";

interface ChipFile {
  file: File;
  kind: ReturnType<typeof classifyClient>;
  id: string;
}

const PROGRESS_PHASES = [
  "Uploading files…",
  "Parsing exports…",
  "Computing metrics…",
  "Comparing to prior period…",
  "Saving snapshot…",
];

export default function UploadForm() {
  const router = useRouter();
  const initial = defaultRange();
  const [files, setFiles] = useState<ChipFile[]>([]);
  const [name, setName] = useState<string>("");
  const [periodStart, setPeriodStart] = useState<string>(initial.start);
  const [periodEnd, setPeriodEnd] = useState<string>(initial.end);
  const [busy, setBusy] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activePresetId = matchPreset({ start: periodStart, end: periodEnd });

  const validation = useMemo(() => {
    const out: { field: string; message: string }[] = [];
    if (files.length === 0) out.push({ field: "files", message: "Add at least one file." });
    if (periodStart && periodEnd && new Date(periodStart) > new Date(periodEnd)) {
      out.push({ field: "dates", message: "Start date must be on or before end date." });
    }
    const todayStr = toDateInput(new Date());
    if (periodEnd > todayStr) {
      out.push({ field: "dates", message: "End date can't be in the future." });
    }
    const recognized = files.filter((f) => f.kind !== "unrecognized").length;
    if (files.length > 0 && recognized === 0) {
      out.push({
        field: "files",
        message: "None of these filenames match a known export. The report will be empty.",
      });
    }
    return out;
  }, [files, periodStart, periodEnd]);

  const submitDisabled = busy || files.length === 0 || validation.some((v) => v.field === "dates");

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).map<ChipFile>((file) => ({
      file,
      kind: classifyClient(file.name),
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    setFiles((prev) => {
      const seen = new Set(prev.map((p) => `${p.file.name}:${p.file.size}`));
      return [...prev, ...incoming.filter((f) => !seen.has(`${f.file.name}:${f.file.size}`))];
    });
    setError(null);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    addFiles(e.target.files);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  useEffect(() => {
    if (!busy) return;
    setPhaseIdx(0);
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < PROGRESS_PHASES.length; i++) {
      timeouts.push(setTimeout(() => setPhaseIdx(i), i * 1400));
    }
    return () => timeouts.forEach(clearTimeout);
  }, [busy]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (files.length === 0) {
      setError("Please add at least one file.");
      return;
    }
    if (validation.some((v) => v.field === "dates")) {
      setError(validation.find((v) => v.field === "dates")?.message ?? "Invalid date range.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("periodStart", new Date(periodStart).toISOString());
      const endDate = new Date(periodEnd);
      endDate.setHours(23, 59, 59, 999);
      fd.set("periodEnd", endDate.toISOString());
      if (name.trim() !== "") fd.set("name", name.trim());
      files.forEach((f, i) => fd.append(`file_${i}`, f.file));
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

  const recognizedCount = files.filter((f) => f.kind !== "unrecognized").length;
  const unknownCount = files.length - recognizedCount;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-lg border border-border bg-surface shadow-soft p-5 sm:p-6"
    >
      {/* Dropzone */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="upload" className="mb-0">Source files</Label>
          {files.length > 0 && (
            <span className="text-xs text-text-subtle tabular">
              {recognizedCount} recognized
              {unknownCount > 0 && <> · {unknownCount} unknown</>}
            </span>
          )}
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "rounded-lg border-2 border-dashed p-5 transition-colors cursor-pointer text-center",
            isDragOver
              ? "border-accent bg-accent-soft"
              : "border-border bg-surface-2/40 hover:bg-surface-2 hover:border-border-strong",
          )}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          aria-label="Upload export files"
        >
          <input
            id="upload"
            ref={inputRef}
            type="file"
            multiple
            accept=".zip,.xlsx"
            onChange={onInputChange}
            className="sr-only"
          />
          <CloudUpload className="mx-auto h-7 w-7 text-text-muted" aria-hidden />
          <p className="mt-2 text-sm text-text">
            <span className="font-medium text-accent">Click to choose</span> or drag and drop
          </p>
          <p className="text-xs text-text-subtle mt-0.5">HubSpot zip / xlsx + Google Ads campaign report</p>
        </div>

        {files.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {files.map((f) => {
              const Icon =
                f.kind === "zip"
                  ? FileArchive
                  : f.kind === "unrecognized"
                  ? FileQuestion
                  : FileSpreadsheet;
              return (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2/60 px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        f.kind === "unrecognized" ? "text-warning" : "text-text-muted",
                      )}
                      aria-hidden
                    />
                    <span className="truncate text-sm" title={f.file.name}>
                      {f.file.name}
                    </span>
                    <span className="text-[0.7rem] text-text-subtle tabular shrink-0">
                      {Math.round(f.file.size / 1024).toLocaleString()} KB
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={fileKindVariant(f.kind)} size="sm">
                      {FILE_KIND_LABEL[f.kind]}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => removeFile(f.id)}
                      aria-label={`Remove ${f.file.name}`}
                      className="rounded-md p-1 text-text-subtle hover:bg-surface-3 hover:text-text transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {validation
          .filter((v) => v.field === "files")
          .map((v, i) => (
            <p key={i} className="mt-2 text-xs text-warning flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              {v.message}
            </p>
          ))}
      </div>

      {/* Report name */}
      <div>
        <Label htmlFor="name">Report name <span className="font-normal text-text-subtle">— optional</span></Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Q1 2026 paid pipeline"
        />
      </div>

      {/* Date range */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="mb-0">Period</Label>
          {activePresetId && (
            <span className="text-xs text-text-subtle">
              {DATE_RANGE_PRESETS.find((p) => p.id === activePresetId)?.label}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {DATE_RANGE_PRESETS.map((p) => {
            const active = activePresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  const r = p.compute(new Date());
                  setPeriodStart(r.start);
                  setPeriodEnd(r.end);
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="periodStart" className="text-xs text-text-muted mb-1">Start</Label>
            <Input
              id="periodStart"
              type="date"
              value={periodStart}
              max={periodEnd}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="tabular"
            />
          </div>
          <div>
            <Label htmlFor="periodEnd" className="text-xs text-text-muted mb-1">End</Label>
            <Input
              id="periodEnd"
              type="date"
              value={periodEnd}
              min={periodStart}
              max={toDateInput(new Date())}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="tabular"
            />
          </div>
        </div>
        {validation
          .filter((v) => v.field === "dates")
          .map((v, i) => (
            <p key={i} className="mt-2 text-xs text-danger flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              {v.message}
            </p>
          ))}
      </div>

      {/* Footer */}
      {error && (
        <div className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="text-xs text-text-subtle min-h-[1.25rem] flex items-center gap-1.5" aria-live="polite">
          {busy && (
            <>
              <Spinner className="h-3.5 w-3.5" />
              <span>{PROGRESS_PHASES[phaseIdx]}</span>
            </>
          )}
        </div>
        <Button type="submit" variant="primary" size="lg" disabled={submitDisabled}>
          {busy ? (
            <>
              <Spinner /> Generating…
            </>
          ) : (
            <>Generate report</>
          )}
        </Button>
      </div>
    </form>
  );
}
