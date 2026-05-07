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
    lines.push(`- **Cost per inbound lead:** ${fmtMoney(c.costPerLead)} ${deltaMoney(c.costPerLead, p?.costPerLead ?? null)}`);
  } else {
    lines.push(`- **Cost per inbound lead:** — (no leads in period)`);
  }
  lines.push(``);

  // 2. Source breakdown
  lines.push(`## Inbound leads by source`);
  lines.push(``);
  if (c.bySource.length === 0) {
    lines.push(`_No source data available._`);
  } else {
    lines.push(`| Source | Count | % of total |`);
    lines.push(`| --- | ---: | ---: |`);
    for (const row of c.bySource) {
      lines.push(`| ${row.source} | ${fmtNumber(row.count)} | ${fmtPct(row.pct)} |`);
    }
  }
  lines.push(``);

  // 3. Pipeline stage breakdown
  lines.push(`## Inbound leads by pipeline stage`);
  lines.push(``);
  if (c.byStage.length === 0) {
    lines.push(`_No deal-stage data available for this period._`);
  } else {
    lines.push(`| Stage | Count | % of total |`);
    lines.push(`| --- | ---: | ---: |`);
    for (const row of c.byStage) {
      lines.push(`| ${row.stage} | ${fmtNumber(row.count)} | ${fmtPct(row.pct)} |`);
    }
  }
  lines.push(``);

  // 3b. Country breakdown
  lines.push(`## Inbound leads by country`);
  lines.push(``);
  const currentByCountry = c.byCountry ?? [];
  const priorByCountry = p?.byCountry ?? [];
  if (currentByCountry.length === 0) {
    lines.push(`_No country data available._`);
  } else {
    const priorCounts = new Map(priorByCountry.map((r) => [r.country, r.count]));
    lines.push(`| Country | Count | % of total | Prior | Δ vs prior |`);
    lines.push(`| --- | ---: | ---: | ---: | --- |`);
    for (const row of currentByCountry) {
      const prior = priorCounts.get(row.country) ?? 0;
      lines.push(
        `| ${row.country} | ${fmtNumber(row.count)} | ${fmtPct(row.pct)} | ${
          p ? fmtNumber(prior) : "—"
        } | ${countryDelta(row.count, prior, p != null)} |`,
      );
    }
  }
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
  lines.push(`| Cost per lead | ${c.costPerLead != null ? fmtMoney(c.costPerLead) : "—"} | ${p?.costPerLead != null ? fmtMoney(p.costPerLead) : "—"} |`);
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
  const leadDelta = pctChange(c.inboundLeadCount, p.inboundLeadCount);
  const spendDelta = pctChange(c.adSpend, p.adSpend);
  const cplDelta = pctChange(c.costPerLead ?? 0, p.costPerLead ?? 0);
  const direction = (n: number) => (n > 0 ? "up" : n < 0 ? "down" : "flat");
  return `Inbound lead volume is **${direction(leadDelta)} ${Math.abs(leadDelta).toFixed(1)}%** vs the prior period (${fmtNumber(c.inboundLeadCount)} vs ${fmtNumber(p.inboundLeadCount)}). Google Ads spend is **${direction(spendDelta)} ${Math.abs(spendDelta).toFixed(1)}%** (${fmtMoney(c.adSpend)} vs ${fmtMoney(p.adSpend)}), and cost-per-lead is **${direction(cplDelta)} ${Math.abs(cplDelta).toFixed(1)}%**.`;
}

function pctChange(curr: number, prior: number): number {
  if (!prior) return 0;
  return ((curr - prior) / prior) * 100;
}

function countryDelta(curr: number, prior: number, hasPrior: boolean): string {
  if (!hasPrior) return "—";
  if (prior === 0) return curr > 0 ? "(new)" : "→ 0";
  const change = ((curr - prior) / prior) * 100;
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "→";
  const sign = change > 0 ? "+" : "";
  return `${arrow} ${sign}${change.toFixed(1)}%`;
}
