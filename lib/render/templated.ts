import type { Metrics, PeriodMetrics } from "../types";
import { delta, deltaMoney, fmtDate, fmtDateRange, fmtMoney, fmtNumber, fmtPct } from "./format";

export function renderTemplatedMarkdown(m: Metrics): string {
  const periodLabel = fmtDateRange(m.periodStart, m.periodEnd);
  const priorLabel = fmtDateRange(m.priorPeriodStart, m.priorPeriodEnd);
  const c = m.current;
  const p = m.prior;

  const lines: string[] = [];

  lines.push(`# Inbound Lead Report`);
  lines.push(``);
  lines.push(`**Period:** ${periodLabel}  `);
  lines.push(`**Prior period:** ${priorLabel} ${comparisonSourceLabel(m)}`);
  if (m.adsPeriodLabel) {
    lines.push(`**Google Ads export period:** ${m.adsPeriodLabel}`);
  }
  lines.push(``);

  // 1. Headline numbers
  lines.push(`## Headline numbers`);
  lines.push(``);
  lines.push(`- **Inbound leads generated:** ${fmtNumber(c.inboundLeadCount)} ${delta(c.inboundLeadCount, p?.inboundLeadCount)}`);
  lines.push(`- **Total Google Ads spend:** ${fmtMoney(c.adSpend)} ${deltaMoney(c.adSpend, p?.adSpend)}`);
  lines.push(`- **Total deal value created:** ${fmtMoney(c.totalDealValue)} ${deltaMoney(c.totalDealValue, p?.totalDealValue)}`);
  if (c.costPerLead != null) {
    lines.push(`- **Cost per paid search lead:** ${fmtMoney(c.costPerLead)} ${deltaMoney(c.costPerLead, p?.costPerLead ?? null)}`);
  } else {
    lines.push(`- **Cost per paid search lead:** — (no paid search leads in period)`);
  }
  lines.push(``);

  // 2. Source breakdown
  lines.push(`## Inbound leads by source`);
  lines.push(``);
  appendBreakdownTable(lines, {
    keyLabel: "Source",
    emptyMessage: "_No source data available._",
    currentRows: c.bySource,
    priorRows: p?.bySource,
    hasPrior: p != null,
    keyOf: (r) => r.source,
  });
  lines.push(``);

  // 3. Pipeline stage breakdown
  lines.push(`## Inbound leads by pipeline stage`);
  lines.push(``);
  appendBreakdownTable(lines, {
    keyLabel: "Stage",
    emptyMessage: "_No deal-stage data available for this period._",
    currentRows: c.byStage,
    priorRows: p?.byStage,
    hasPrior: p != null,
    keyOf: (r) => r.stage,
  });
  lines.push(``);

  // 3b. Country breakdown
  lines.push(`## Inbound leads by country`);
  lines.push(``);
  appendBreakdownTable(lines, {
    keyLabel: "Country",
    emptyMessage: "_No country data available._",
    currentRows: c.byCountry ?? [],
    priorRows: p?.byCountry,
    hasPrior: p != null,
    keyOf: (r) => r.country,
  });
  lines.push(``);

  // 4. Spend vs results
  lines.push(`## Budget spend vs results`);
  lines.push(``);
  lines.push(`Total Google Ads spend in this period was **${fmtMoney(c.adSpend)}**, which produced **${fmtNumber(c.inboundLeadCount)} inbound leads** and **${fmtMoney(c.totalDealValue)} of pipeline value**.`);
  lines.push(``);
  lines.push(`| Metric | Current | Prior |`);
  lines.push(`| --- | ---: | ---: |`);
  lines.push(`| Spend | ${fmtMoney(c.adSpend)} | ${p ? fmtMoney(p.adSpend) : "—"} |`);
  lines.push(`| Inbound leads | ${fmtNumber(c.inboundLeadCount)} | ${p ? fmtNumber(p.inboundLeadCount) : "—"} |`);
  lines.push(`| Pipeline created | ${fmtMoney(c.totalDealValue)} | ${p ? fmtMoney(p.totalDealValue) : "—"} |`);
  lines.push(`| Cost per paid search lead | ${c.costPerLead != null ? fmtMoney(c.costPerLead) : "—"} | ${p?.costPerLead != null ? fmtMoney(p.costPerLead) : "—"} |`);
  lines.push(`| Spend / pipeline $ | ${c.costPerDealDollar != null ? c.costPerDealDollar.toFixed(3) : "—"} | ${p?.costPerDealDollar != null ? p.costPerDealDollar.toFixed(3) : "—"} |`);
  lines.push(``);

  // 5. High-value deals
  lines.push(`## High-value inbound deals (>$15,000)`);
  lines.push(``);
  if (c.highValueDeals.length === 0) {
    lines.push(`_No inbound deals over $15,000 were created in this period._`);
  } else {
    lines.push(`| Deal | Company | Amount | Stage | Created |`);
    lines.push(`| --- | --- | ---: | --- | --- |`);
    for (const d of c.highValueDeals) {
      lines.push(`| ${d.dealName} | ${d.company} | ${fmtMoney(d.amount)} | ${d.stage} | ${fmtDate(d.createDate)} |`);
    }
  }
  lines.push(``);

  // 6. Pipeline-stage spotlight
  lines.push(`## Pipeline stage spotlight`);
  lines.push(``);
  lines.push(`- **Currently in DEMO:** ${fmtNumber(c.demoCount)} inbound deals ${delta(c.demoCount, p?.demoCount)}`);
  lines.push(`- **Currently in NEGOTIATING:** ${fmtNumber(c.negotiatingCount)} inbound deals ${delta(c.negotiatingCount, p?.negotiatingCount)}`);
  lines.push(`- **Entered "Contract is live" in this period:** ${fmtNumber(c.enteredContractLiveCount)} ${delta(c.enteredContractLiveCount, p?.enteredContractLiveCount)}`);
  if (c.enteredContractLiveDeals.length > 0) {
    lines.push(``);
    lines.push(`Deals that entered Contract is live:`);
    lines.push(``);
    lines.push(`| Deal | Company | ARR / Amount | Closed |`);
    lines.push(`| --- | --- | ---: | --- |`);
    for (const d of c.enteredContractLiveDeals) {
      lines.push(`| ${d.dealName} | ${d.company} | ${fmtMoney(d.amount)} | ${fmtDate(d.createDate)} |`);
    }
  }
  lines.push(``);

  // 7. Period-over-period summary
  lines.push(`## Period-over-period summary`);
  lines.push(``);
  if (!p) {
    lines.push(`_No prior-period data available; this is the first stored report._`);
  } else {
    lines.push(periodSummaryParagraph(c, p));
  }
  lines.push(``);

  // Warnings
  if (m.warnings && m.warnings.length > 0) {
    lines.push(`---`);
    lines.push(``);
    lines.push(`**Notes:**`);
    for (const w of m.warnings) lines.push(`- ${w}`);
    lines.push(``);
  }

  return lines.join("\n");
}

function comparisonSourceLabel(m: Metrics): string {
  const c = m.comparisonInfo;
  if (c.source === "current_upload") return "_(derived from this upload)_";
  if (c.source === "stored_snapshot") return "_(from stored snapshot)_";
  return "_(no prior data available)_";
}

function periodSummaryParagraph(c: PeriodMetrics, p: PeriodMetrics): string {
  const leads = describePctChange(c.inboundLeadCount, p.inboundLeadCount, fmtNumber);
  const spend = describePctChange(c.adSpend, p.adSpend, fmtMoney);
  const cpl = describePctChange(c.costPerLead ?? 0, p.costPerLead ?? 0, fmtMoney);
  return `Inbound lead volume is **${leads}**. Google Ads spend is **${spend}**, and cost per paid search lead is **${cpl}**.`;
}

function describePctChange(curr: number, prior: number, fmt: (n: number) => string): string {
  if (prior === 0 && curr === 0) return `held at ${fmt(0)}`;
  if (prior === 0) return `started from 0 (now ${fmt(curr)})`;
  const change = ((curr - prior) / prior) * 100;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
  return `${direction} ${Math.abs(change).toFixed(1)}% vs the prior period (${fmt(curr)} vs ${fmt(prior)})`;
}

function breakdownDelta(curr: number, prior: number, hasComparablePrior: boolean): string {
  if (!hasComparablePrior) return "—";
  if (prior === 0) return curr > 0 ? "(new)" : "→ 0";
  const change = ((curr - prior) / prior) * 100;
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "→";
  const sign = change > 0 ? "+" : "";
  return `${arrow} ${sign}${change.toFixed(1)}%`;
}

function appendBreakdownTable<T extends { count: number; pct: number }>(
  lines: string[],
  opts: {
    keyLabel: string;
    emptyMessage: string;
    currentRows: T[];
    priorRows: T[] | undefined;
    hasPrior: boolean;
    keyOf: (row: T) => string;
  },
): void {
  if (opts.currentRows.length === 0) {
    lines.push(opts.emptyMessage);
    return;
  }
  const hasComparablePrior = opts.hasPrior && opts.priorRows != null;
  const priorCounts = new Map((opts.priorRows ?? []).map((r) => [opts.keyOf(r), r.count]));
  lines.push(`| ${opts.keyLabel} | Count | % of total | Prior | Δ vs prior |`);
  lines.push(`| --- | ---: | ---: | ---: | --- |`);
  for (const row of opts.currentRows) {
    const key = opts.keyOf(row);
    const prior = priorCounts.get(key) ?? 0;
    lines.push(
      `| ${key} | ${fmtNumber(row.count)} | ${fmtPct(row.pct)} | ${
        hasComparablePrior ? fmtNumber(prior) : "—"
      } | ${breakdownDelta(row.count, prior, hasComparablePrior)} |`,
    );
  }
}
