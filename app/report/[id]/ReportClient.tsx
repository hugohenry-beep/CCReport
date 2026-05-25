"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Copy,
  Check,
  Download,
  FileCode,
  FileText,
  FileSpreadsheet,
  History,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash2,
  RotateCw,
} from "lucide-react";
import type { Metrics } from "@/lib/types";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Input";
import { Badge } from "@/app/components/ui/Badge";
import { Spinner } from "@/app/components/ui/Spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/Tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/DropdownMenu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/Dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/Tooltip";
import { KpiRow } from "@/app/components/KpiRow";
import ReportToc from "@/app/components/ReportToc";
import SectionedReport, { deriveSectionTitles } from "@/app/components/SectionedReport";

interface Props {
  reportId: string;
  initialHtml: string;
  initialMarkdown: string;
  initialName: string | null;
  metrics: Metrics;
  meta: {
    period: string;
    priorPeriod: string;
    adsPeriodLabel: string | null;
    cmpLabel: string;
    warnings: string[];
  };
}

type Mode = "report" | "written";

export default function ReportClient({
  reportId,
  initialHtml,
  initialMarkdown,
  initialName,
  metrics,
  meta,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("report");
  const [name, setName] = useState<string | null>(initialName);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(initialName ?? "");
  const [narrativeHtml, setNarrativeHtml] = useState<string | null>(null);
  const [narrativeMd, setNarrativeMd] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const sections = useMemo(
    () => deriveSectionTitles(initialHtml, metrics),
    [initialHtml, metrics],
  );

  async function loadNarrative({ force = false }: { force?: boolean } = {}) {
    if (narrativeHtml && !force) return;
    setError(null);
    setNarrativeLoading(true);
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
      const { html, markdown } = await res.json();
      setNarrativeHtml(html);
      setNarrativeMd(markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setNarrativeLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    if (next === "written" && !narrativeHtml && !narrativeLoading) {
      loadNarrative();
    }
  }

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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
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

  async function recomputePrior() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/recompute-prior`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? `Recompute failed (${res.status})`);
      }
      if (body.matched) {
        const range =
          body.snapshotPeriodStart && body.snapshotPeriodEnd
            ? ` (${new Date(body.snapshotPeriodStart).toLocaleDateString()} – ${new Date(body.snapshotPeriodEnd).toLocaleDateString()})`
            : "";
        setInfo(`Prior comparison recomputed against stored snapshot${range}.`);
        router.refresh();
      } else {
        setInfo("No matching prior report found (within ±2 days of the prior period).");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyCurrent() {
    setError(null);
    const text = mode === "written" && narrativeMd ? narrativeMd : initialMarkdown;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable (try over HTTPS or a modern browser).");
      }
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top bar: back link, name, actions */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            aria-label="Back to home"
          >
            <a href="/">
              <ArrowLeft className="h-4 w-4" />
            </a>
          </Button>
          {editingName ? (
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") {
                    setEditingName(false);
                    setNameDraft(name ?? "");
                  }
                }}
                placeholder="Report name"
                autoFocus
                disabled={busy}
              />
              <Button variant="primary" size="sm" onClick={saveName} disabled={busy}>Save</Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingName(false);
                  setNameDraft(name ?? "");
                }}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight truncate">
              {name ?? <span className="text-text-subtle italic font-normal">Unnamed report</span>}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap no-print">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="md" disabled={busy}>
                <Download className="h-4 w-4" /> Download <ChevronDown className="h-3.5 w-3.5 -mr-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Download as</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <a href={`/report/${reportId}/md`}>
                  <FileText className="h-3.5 w-3.5" /> Markdown
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/report/${reportId}/html`}>
                  <FileCode className="h-3.5 w-3.5" /> HTML
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/report/${reportId}/pdf`}>
                  <FileText className="h-3.5 w-3.5" /> PDF
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/report/${reportId}/xlsx`}>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (.xlsx)
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon" onClick={copyCurrent} aria-label="Copy Markdown">
                {copyStatus === "copied" ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {copyStatus === "copied" ? "Copied!" : "Copy Markdown"}
            </TooltipContent>
          </Tooltip>

          {mode === "written" && narrativeHtml && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => loadNarrative({ force: true })}
                  disabled={narrativeLoading}
                  aria-label="Regenerate narrative"
                >
                  {narrativeLoading ? <Spinner /> : <RotateCw className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Regenerate narrative</TooltipContent>
            </Tooltip>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onSelect={() => {
                  setNameDraft(name ?? "");
                  setEditingName(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem disabled={busy} onSelect={() => recomputePrior()}>
                <History className="h-3.5 w-3.5" /> Recompute prior
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setConfirmDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Meta strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted tabular">
        <span>
          <span className="text-text-subtle">Period</span>{" "}
          <span className="text-text font-medium">{meta.period}</span>
        </span>
        <span className="text-text-subtle">·</span>
        <span>
          <span className="text-text-subtle">Prior</span> {meta.priorPeriod}
        </span>
        <Badge variant="outline">{meta.cmpLabel}</Badge>
        {meta.adsPeriodLabel && (
          <Badge variant="default">Ads: {meta.adsPeriodLabel}</Badge>
        )}
      </div>

      {/* Warnings */}
      {meta.warnings.length > 0 && (
        <details className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm">
          <summary className="cursor-pointer text-warning flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            {meta.warnings.length} parse note{meta.warnings.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 space-y-0.5 text-xs text-text-muted pl-6 list-disc">
            {meta.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      {/* Segmented mode toggle */}
      <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
        <div className="flex items-center justify-between flex-wrap gap-3 no-print">
          <TabsList>
            <TabsTrigger value="report">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Report
            </TabsTrigger>
            <TabsTrigger value="written">
              <Sparkles className="h-3.5 w-3.5" /> Written
            </TabsTrigger>
          </TabsList>
          <p className="text-xs text-text-subtle max-w-md">
            {mode === "report"
              ? "Chart-rich view with tables, KPIs, and section navigation."
              : "Email-friendly prose summary — no tables, no charts. Paste into Outlook or Gmail."}
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {info && (
          <div className="mt-4 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-text flex items-start gap-2">
            <Check className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
            <span>{info}</span>
          </div>
        )}

        <TabsContent value="report" className="mt-5">
          <KpiRow metrics={metrics} />
          <div className="mt-6 grid lg:grid-cols-[180px_1fr] gap-6">
            <ReportToc sections={sections} />
            <div className="min-w-0">
              <SectionedReport bodyHtml={initialHtml} metrics={metrics} />
            </div>
          </div>

          <details className="mt-8 rounded-lg border border-border bg-surface group no-print">
            <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium flex items-center justify-between text-text-muted hover:text-text">
              <span className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                View raw Markdown source
              </span>
              <span className="text-xs text-text-subtle group-open:hidden">click to expand</span>
            </summary>
            <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={copyCurrent}>
                  {copyStatus === "copied" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copyStatus === "copied" ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap bg-surface-2 border border-border rounded-md p-3 max-h-[480px] font-mono">
                {initialMarkdown}
              </pre>
            </div>
          </details>
        </TabsContent>

        <TabsContent value="written" className="mt-5">
          {narrativeLoading ? (
            <NarrativeSkeleton />
          ) : narrativeHtml ? (
            <article
              className="written-prose mx-auto"
              dangerouslySetInnerHTML={{ __html: narrativeHtml }}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-surface-2/40 p-8 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-text-subtle" aria-hidden />
              <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">
                Tap below to generate an email-friendly written summary. We&rsquo;ll rewrite the
                report into prose and bullet points — no tables, no charts.
              </p>
              <div className="mt-4">
                <Button variant="primary" onClick={() => loadNarrative()}>
                  <Sparkles className="h-4 w-4" /> Generate written summary
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this report?</DialogTitle>
            <DialogDescription>
              {meta.period}{name ? ` · ${name}` : ""}. This action can&rsquo;t be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-xs text-danger flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={busy}>Cancel</Button>
            </DialogClose>
            <Button variant="danger" onClick={remove} disabled={busy}>
              {busy ? "Deleting…" : "Delete report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NarrativeSkeleton() {
  return (
    <div className="written-prose mx-auto space-y-3 animate-pulse" aria-busy="true">
      <div className="h-7 w-2/3 rounded bg-surface-2" />
      <div className="space-y-2 mt-4">
        <div className="h-3 w-full rounded bg-surface-2" />
        <div className="h-3 w-11/12 rounded bg-surface-2" />
        <div className="h-3 w-10/12 rounded bg-surface-2" />
      </div>
      <div className="h-5 w-1/3 rounded bg-surface-2 mt-6" />
      <div className="space-y-2">
        <div className="h-3 w-11/12 rounded bg-surface-2" />
        <div className="h-3 w-10/12 rounded bg-surface-2" />
        <div className="h-3 w-9/12 rounded bg-surface-2" />
      </div>
    </div>
  );
}

