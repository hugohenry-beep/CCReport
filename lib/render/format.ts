export function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtMoneyDetailed(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function fmtNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function fmtDateRange(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function delta(curr: number, prior: number | null | undefined): string {
  if (prior == null || prior === 0) return curr > 0 ? "(no prior baseline)" : "(no prior baseline)";
  const change = ((curr - prior) / prior) * 100;
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "→";
  const sign = change > 0 ? "+" : "";
  return `${arrow} ${sign}${change.toFixed(1)}% vs prior (${prior})`;
}

export function deltaMoney(curr: number, prior: number | null | undefined): string {
  if (prior == null || prior === 0) return "(no prior baseline)";
  const change = ((curr - prior) / prior) * 100;
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "→";
  const sign = change > 0 ? "+" : "";
  return `${arrow} ${sign}${change.toFixed(1)}% vs prior (${fmtMoney(prior)})`;
}
