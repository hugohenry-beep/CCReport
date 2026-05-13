"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, AlertTriangle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/DropdownMenu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/Dialog";
import { DeltaBadge } from "./components/DeltaBadge";
import { fmtDateRange, fmtMoney, fmtNumber } from "@/lib/render/format";

interface Props {
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

export default function ReportListItem({
  id,
  name,
  periodStart,
  periodEnd,
  createdAt,
  leads,
  spend,
  pipeline,
  priorLeads,
  warningCount,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Delete failed (${res.status})`);
      }
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function openReport() {
    router.push(`/report/${id}`);
  }

  if (editing) {
    return (
      <li className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setEditing(false);
                setDraft(name ?? "");
              }
            }}
            placeholder="Report name"
            autoFocus
            disabled={busy}
            className="text-sm"
          />
          <Button variant="primary" size="sm" onClick={save} disabled={busy}>
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(false);
              setDraft(name ?? "");
              setError(null);
            }}
            disabled={busy}
          >
            Cancel
          </Button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-danger flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {error}
          </p>
        )}
      </li>
    );
  }

  return (
    <li className="group transition-colors hover:bg-surface-2/60">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={openReport}
          className="flex-1 min-w-0 text-left -m-1 p-1 rounded outline-none"
          aria-label={`Open ${name ?? "unnamed report"}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-sm font-medium text-text">
              {name ?? <span className="text-text-subtle italic font-normal">Unnamed report</span>}
            </span>
            {warningCount > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-1.5 py-0.5 text-[0.65rem] font-medium text-warning"
                title={`${warningCount} parse warning${warningCount === 1 ? "" : "s"}`}
              >
                <AlertTriangle className="h-3 w-3" />
                {warningCount}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-text-subtle tabular">
            {fmtDateRange(periodStart, periodEnd)} · Generated {new Date(createdAt).toLocaleString()}
          </div>
          {(leads != null || spend != null || pipeline != null) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {leads != null && (
                <span className="inline-flex items-center gap-1.5 tabular">
                  <span className="text-text-subtle">Leads</span>
                  <span className="text-text font-medium">{fmtNumber(leads)}</span>
                  {priorLeads != null && (
                    <DeltaBadge current={leads} prior={priorLeads} compact />
                  )}
                </span>
              )}
              {spend != null && spend > 0 && (
                <span className="inline-flex items-center gap-1.5 tabular">
                  <span className="text-text-subtle">Spend</span>
                  <span className="text-text font-medium">{fmtMoney(spend)}</span>
                </span>
              )}
              {pipeline != null && pipeline > 0 && (
                <span className="inline-flex items-center gap-1.5 tabular">
                  <span className="text-text-subtle">Pipeline</span>
                  <span className="text-text font-medium">{fmtMoney(pipeline)}</span>
                </span>
              )}
            </div>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Report actions"
              disabled={busy}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onSelect={() => {
                setDraft(name ?? "");
                setEditing(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => setConfirmOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {error && !confirmOpen && (
        <p className="mx-4 mb-2 text-xs text-danger flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this report?</DialogTitle>
            <DialogDescription>
              {fmtDateRange(periodStart, periodEnd)}
              {name ? ` · ${name}` : ""}. This action can't be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-xs text-danger flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="md" disabled={busy}>Cancel</Button>
            </DialogClose>
            <Button variant="danger" size="md" onClick={remove} disabled={busy}>
              {busy ? "Deleting…" : "Delete report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
