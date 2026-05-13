/**
 * EXECUTIVE WRITTEN BRIEFING — Standards of Excellence
 * =====================================================
 *
 * Value proposition: A 90-second weekly briefing that turns raw inbound-lead
 * data into a decision-ready picture of where ad budget is working, where
 * pipeline is heading, and what needs attention this week.
 *
 * Audience: CRO / CMO / CEO. Read on mobile. Skim, then act.
 *
 * STANDARDS:
 *  1. Lead with the bottom line — 1-line headline + 3-5 TL;DR bullets up top.
 *  2. Every number paired with direction (▲/▼/→) vs prior.
 *  3. Frame metrics as business outcomes, not metric names
 *     ("pipeline created" > "totalDealValue").
 *  4. Surface what moved (top movers). Hide what didn't.
 *  5. Connect spend → leads → pipeline → CPL on a single line.
 *  6. Forward indicators (DEMO, NEGOTIATING) before backward (Contract Live).
 *  7. Consistent skeleton week over week.
 *  8. Auto-flag anomalies:
 *       - leads pctChange ≤ -25%
 *       - CPL pctChange ≥ +20%
 *       - |spend pctChange| ≥ 50%
 *       - pipeline value === 0 when prior > 0
 *       - DEMO stalled with no NEGOTIATING uplift
 *       - any metrics.warnings
 *  9. Compact data-provenance footer (period, prior, ads label, comparison source).
 * 10. Plain confident language. No fluff. No hedging. Causal hypotheses
 *     ("driven by", "because of") are off-limits — attribution data isn't in
 *     this report. Pattern-level observation ("third week of decline",
 *     "biggest jump in the comparison window") is encouraged inside the
 *     analytical blocks.
 * 11. Numbers are sacred — programmatic source of truth. LLM may NOT invent.
 * 12. Mobile-friendly markdown — bullets > tables. Reserve tables for ≥5-row
 *     breakdowns (high-value deals, contract-live entries).
 * 13. Analytical narrative goes in three dedicated blocks (summary,
 *     efficiency take, outlook). Scannable zones (TL;DR, scorecard, what
 *     moved, pipeline health, watch) stay bullet-tight.
 *
 * SKELETON (fixed order):
 *   HEADLINE → EXECUTIVE SUMMARY → TL;DR → SCORECARD → WHAT MOVED →
 *   PIPELINE HEALTH → HIGH-VALUE DEALS → EFFICIENCY → EFFICIENCY TAKE →
 *   WATCH THIS WEEK → OUTLOOK → FOOTER.
 *
 * LLM rewrites SEVEN prose zones, delimited by HTML comment markers:
 *   <!-- LLM:HEADLINE -->...<!-- /LLM:HEADLINE -->        (1 sentence)
 *   <!-- LLM:SUMMARY -->...<!-- /LLM:SUMMARY -->          (2-3 sentence narrative)
 *   <!-- LLM:TLDR -->...<!-- /LLM:TLDR -->                (3-5 bullets)
 *   <!-- LLM:WHATMOVED -->...<!-- /LLM:WHATMOVED -->      (bullets)
 *   <!-- LLM:EFFICIENCYTAKE -->...<!-- /LLM:EFFICIENCYTAKE --> (1-2 sentences)
 *   <!-- LLM:WATCH -->...<!-- /LLM:WATCH -->              (bullets)
 *   <!-- LLM:OUTLOOK -->...<!-- /LLM:OUTLOOK -->          (1-2 sentences)
 * Validator rejects any LLM output containing numeric tokens not in the
 * programmatic whitelist. On failure, the route silently returns the
 * programmatic markdown unchanged.
 */

import type { Metrics } from "../types";
import {
  deriveExecutiveFacts,
  type DeltaPct,
  type ExecutiveFacts,
  type Mover,
  type ScorecardRow,
  type TopHighValueDeal,
} from "./executiveFacts";

export interface ExecutiveBriefing {
  markdown: string;
  facts: ExecutiveFacts;
}

export function renderExecutiveBriefing(m: Metrics): ExecutiveBriefing {
  const facts = deriveExecutiveFacts(m);
  const markdown = renderExecutiveMarkdownFromFacts(facts);
  return { markdown, facts };
}

export function renderExecutiveMarkdown(m: Metrics): string {
  return renderExecutiveBriefing(m).markdown;
}

function renderExecutiveMarkdownFromFacts(facts: ExecutiveFacts): string {
  const lines: string[] = [];
  renderHeadline(lines, facts);
  renderSummary(lines, facts);
  renderTldr(lines, facts);
  renderScorecard(lines, facts);
  renderWhatMoved(lines, facts);
  renderPipelineHealth(lines, facts);
  renderHighValueDeals(lines, facts);
  renderEfficiency(lines, facts);
  renderEfficiencyTake(lines, facts);
  renderWatch(lines, facts);
  renderOutlook(lines, facts);
  renderFooter(lines, facts);
  return lines.join("\n");
}

function renderHeadline(lines: string[], facts: ExecutiveFacts): void {
  lines.push(`# Weekly Inbound Briefing — ${facts.period.current}`);
  pushWhitelist(facts, facts.period.current);
  lines.push("");
  lines.push("<!-- LLM:HEADLINE -->");
  lines.push(`> ${facts.headline.sentence}`);
  pushTokensFromSentence(facts, facts.headline.sentence);
  lines.push("<!-- /LLM:HEADLINE -->");
  lines.push("");
}

function renderSummary(lines: string[], facts: ExecutiveFacts): void {
  lines.push("## Executive summary");
  lines.push("");
  lines.push("<!-- LLM:SUMMARY -->");
  lines.push(facts.analysis.summary);
  pushTokensFromSentence(facts, facts.analysis.summary);
  lines.push("<!-- /LLM:SUMMARY -->");
  lines.push("");
}

function renderTldr(lines: string[], facts: ExecutiveFacts): void {
  lines.push("## At a glance");
  lines.push("");
  lines.push("<!-- LLM:TLDR -->");
  for (const bullet of facts.tldr) {
    lines.push(`- ${bullet}`);
    pushTokensFromSentence(facts, bullet);
  }
  lines.push("<!-- /LLM:TLDR -->");
  lines.push("");
}

function renderScorecard(lines: string[], facts: ExecutiveFacts): void {
  lines.push("## Scorecard");
  lines.push("");
  for (const row of facts.scorecard) {
    lines.push(`- **${row.label}** — ${scorecardLine(row, facts.hasPrior)}`);
    pushDeltaTokens(facts, row.delta);
  }
  lines.push("");
}

function scorecardLine(row: ScorecardRow, hasPrior: boolean): string {
  if (!row.isAvailable) return `— (not available this period)`;
  const d = row.delta;
  if (!hasPrior) return `${d.formattedCurr}`;
  if (d.prior === null) return `${d.formattedCurr}`;
  if (d.prior === 0 && d.curr > 0) return `${d.formattedCurr} ${d.formattedDelta}`;
  return `${d.formattedCurr} (${d.formattedDelta} vs ${d.formattedPrior})`;
}

function renderWhatMoved(lines: string[], facts: ExecutiveFacts): void {
  lines.push("## What moved");
  lines.push("");
  lines.push("<!-- LLM:WHATMOVED -->");

  if (!facts.hasPrior) {
    lines.push("_No prior period yet — baselines being established._");
    lines.push("<!-- /LLM:WHATMOVED -->");
    lines.push("");
    return;
  }

  const hasAnything = facts.topMovers.length + facts.newEntries.length + facts.lostEntries.length > 0;
  if (!hasAnything) {
    lines.push("_No source or geo shifts above the noise floor._");
    lines.push("<!-- /LLM:WHATMOVED -->");
    lines.push("");
    return;
  }

  for (const mv of facts.topMovers) {
    lines.push(`- **${mv.key}** (${mv.dimension}) — ${formatMoverLine(mv)}`);
    pushMoverTokens(facts, mv);
  }

  if (facts.newEntries.length > 0) {
    lines.push("");
    lines.push("**New this period:**");
    for (const mv of facts.newEntries) {
      lines.push(`- **${mv.key}** — ${mv.currCount} (no prior activity)`);
      pushMoverTokens(facts, mv);
    }
  }

  if (facts.lostEntries.length > 0) {
    lines.push("");
    lines.push("**Went quiet:**");
    for (const mv of facts.lostEntries) {
      lines.push(`- **${mv.key}** — 0 (was ${mv.priorCount})`);
      pushMoverTokens(facts, mv);
    }
  }

  lines.push("<!-- /LLM:WHATMOVED -->");
  lines.push("");
}

function formatMoverLine(mv: Mover): string {
  if (mv.priorCount > 0 && mv.currCount > 0) {
    const absDir = mv.absChange > 0 ? "+" : "";
    return `${mv.currCount} (${mv.formattedDelta}, ${absDir}${mv.absChange} vs ${mv.priorCount})`;
  }
  if (mv.isNew) return `${mv.currCount} (new)`;
  if (mv.isLost) return `0 (was ${mv.priorCount})`;
  return `${mv.currCount}`;
}

function renderPipelineHealth(lines: string[], facts: ExecutiveFacts): void {
  lines.push("## Pipeline health (forward indicators)");
  lines.push("");
  const { demo, negotiating, contractLiveEntries, contractLiveDeals } = facts.pipeline;
  lines.push(`- **In DEMO right now** — ${formatPipelineLine(demo, facts.hasPrior)}`);
  pushDeltaTokens(facts, demo);
  lines.push(`- **In NEGOTIATING right now** — ${formatPipelineLine(negotiating, facts.hasPrior)}`);
  pushDeltaTokens(facts, negotiating);
  lines.push(`- **Entered Contract Live this period** — ${formatPipelineLine(contractLiveEntries, facts.hasPrior)}`);
  pushDeltaTokens(facts, contractLiveEntries);

  if (contractLiveDeals.length > 0) {
    lines.push("");
    if (contractLiveDeals.length < 5) {
      for (const d of contractLiveDeals) {
        lines.push(`  - ${d.dealName} — ${d.company} — ${d.amountFormatted} (${d.stage})`);
        pushWhitelist(facts, d.amountFormatted);
      }
    } else {
      lines.push("| Deal | Company | Amount | Stage |");
      lines.push("| --- | --- | ---: | --- |");
      for (const d of contractLiveDeals) {
        lines.push(`| ${d.dealName} | ${d.company} | ${d.amountFormatted} | ${d.stage} |`);
        pushWhitelist(facts, d.amountFormatted);
      }
    }
  }
  lines.push("");
}

function formatPipelineLine(d: DeltaPct, hasPrior: boolean): string {
  if (!hasPrior || d.prior == null) return `${d.formattedCurr}`;
  if (d.prior === 0 && d.curr > 0) return `${d.formattedCurr} ${d.formattedDelta}`;
  return `${d.formattedCurr} (${d.formattedDelta} vs ${d.formattedPrior})`;
}

function renderHighValueDeals(lines: string[], facts: ExecutiveFacts): void {
  lines.push("## High-value inbound deals (>$15K)");
  pushWhitelist(facts, "$15K", "$15,000", "15000");
  lines.push("");
  if (facts.highValue.count === 0) {
    lines.push("_None this period._");
    lines.push("");
    return;
  }
  const deals = facts.highValue.topDeals;
  if (deals.length < 5) {
    for (const d of deals) {
      lines.push(`- **${d.dealName}** — ${d.company} — ${d.amountFormatted} (${d.stage})`);
      pushWhitelist(facts, d.amountFormatted);
    }
  } else {
    lines.push("| Deal | Company | Amount | Stage |");
    lines.push("| --- | --- | ---: | --- |");
    for (const d of deals) {
      lines.push(`| ${d.dealName} | ${d.company} | ${d.amountFormatted} | ${d.stage} |`);
      pushWhitelist(facts, d.amountFormatted);
    }
  }
  lines.push("");
  lines.push(`**Total:** ${facts.highValue.totalFormatted} across ${facts.highValue.count} deal${facts.highValue.count === 1 ? "" : "s"}.`);
  pushWhitelist(facts, facts.highValue.totalFormatted);
  lines.push("");
}

function renderEfficiency(lines: string[], facts: ExecutiveFacts): void {
  lines.push("## Efficiency");
  lines.push("");
  const leads = facts.scorecard.find((r) => r.key === "inboundLeads")!.delta;
  const spend = facts.scorecard.find((r) => r.key === "adSpend")!.delta;
  const pipeline = facts.scorecard.find((r) => r.key === "pipelineValue")!.delta;
  const cpl = facts.efficiency.cpl;
  const spp = facts.efficiency.spendPerPipelineDollar;
  const pps = facts.efficiency.pipelinePerSpendDollar;

  lines.push(
    `- **This period:** ${spend.formattedCurr} → ${leads.formattedCurr} leads → ${pipeline.formattedCurr} pipeline → ${cpl.formattedCurr}/lead${spp.formattedCurr !== "—" ? `, ${spp.formattedCurr} spend/pipeline$` : ""}.`,
  );
  if (facts.hasPrior) {
    lines.push(
      `- **Prior period:** ${spend.formattedPrior} → ${leads.formattedPrior} leads → ${pipeline.formattedPrior} pipeline → ${cpl.formattedPrior}/lead.`,
    );
  }
  if (pps.curr > 0) {
    if (facts.hasPrior && pps.prior != null) {
      lines.push(`- Every $1 of spend returns ${pps.formattedCurr} of pipeline (${pps.formattedDelta} vs ${pps.formattedPrior}).`);
    } else {
      lines.push(`- Every $1 of spend returns ${pps.formattedCurr} of pipeline.`);
    }
    pushDeltaTokens(facts, pps);
  }
  lines.push("");
}

function renderEfficiencyTake(lines: string[], facts: ExecutiveFacts): void {
  lines.push("### Efficiency take");
  lines.push("");
  lines.push("<!-- LLM:EFFICIENCYTAKE -->");
  lines.push(facts.analysis.efficiencyTake);
  pushTokensFromSentence(facts, facts.analysis.efficiencyTake);
  lines.push("<!-- /LLM:EFFICIENCYTAKE -->");
  lines.push("");
}

function renderOutlook(lines: string[], facts: ExecutiveFacts): void {
  lines.push("## Outlook & recommendation");
  lines.push("");
  lines.push("<!-- LLM:OUTLOOK -->");
  lines.push(facts.analysis.outlook);
  pushTokensFromSentence(facts, facts.analysis.outlook);
  lines.push("<!-- /LLM:OUTLOOK -->");
  lines.push("");
}

function renderWatch(lines: string[], facts: ExecutiveFacts): void {
  lines.push("## Watch this week");
  lines.push("");
  lines.push("<!-- LLM:WATCH -->");
  if (facts.anomalies.length === 0 && facts.warnings.length === 0) {
    lines.push("- No signals outside normal range. Hold course.");
    lines.push("<!-- /LLM:WATCH -->");
    lines.push("");
    return;
  }
  const sorted = [...facts.anomalies].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  for (const a of sorted) {
    const prefix = a.severity === "alert" ? "⚠ " : "";
    lines.push(`- ${prefix}${a.message}`);
    pushTokensFromSentence(facts, a.message);
  }
  if (facts.warnings.length > 0) {
    lines.push("");
    for (const w of facts.warnings) {
      lines.push(`  - _${w}_`);
    }
  }
  lines.push("<!-- /LLM:WATCH -->");
  lines.push("");
}

function severityRank(s: "alert" | "watch"): number {
  return s === "alert" ? 0 : 1;
}

function renderFooter(lines: string[], facts: ExecutiveFacts): void {
  lines.push("---");
  const parts = [
    `Period: ${facts.period.current}`,
    `Prior: ${facts.period.prior}`,
    facts.comparisonNote,
  ];
  if (facts.period.adsLabel) parts.push(`Ads: ${facts.period.adsLabel}`);
  lines.push(`_${parts.join(" · ")}_`);
  pushWhitelist(facts, facts.period.prior);
  if (facts.period.adsLabel) pushWhitelist(facts, facts.period.adsLabel);
}

function pushWhitelist(facts: ExecutiveFacts, ...tokens: string[]): void {
  for (const t of tokens) {
    if (!t) continue;
    if (t === "—") continue;
    facts.numericWhitelist.push(t);
  }
}

function pushDeltaTokens(facts: ExecutiveFacts, d: DeltaPct): void {
  pushWhitelist(facts, d.formattedCurr, d.formattedPrior, d.formattedDelta);
}

function pushMoverTokens(facts: ExecutiveFacts, mv: Mover): void {
  pushWhitelist(facts, mv.formattedDelta);
  facts.numericWhitelist.push(String(mv.currCount));
  facts.numericWhitelist.push(String(mv.priorCount));
  facts.numericWhitelist.push(String(Math.abs(mv.absChange)));
}

function pushTokensFromSentence(facts: ExecutiveFacts, sentence: string): void {
  // Capture every $/%/digit-bearing token that already appears in the
  // deterministically-rendered sentence and add it to the whitelist so the
  // validator accepts paraphrases that preserve the same numbers.
  const tokenRe =
    /\$\s?-?\d[\d,]*(?:\.\d+)?[KMB]?|[+-]?\d+(?:\.\d+)?%|\d+(?:\.\d+)?|\d{1,3}(?:,\d{3})+/g;
  for (const m of sentence.matchAll(tokenRe)) {
    facts.numericWhitelist.push(m[0]);
  }
}
