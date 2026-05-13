/**
 * WEEKLY INBOUND-LEAD RECAP — Standards of Excellence
 * ====================================================
 *
 * Value proposition: A weekly executive recap that reads like a thoughtful
 * operator's note — three headline numbers, a short narrative of insights,
 * a qualification-rate snapshot by region group, the leads that progressed
 * to advanced stages, and a closing pipeline + ARR line.
 *
 * Audience: CRO / CMO / CEO. Mobile. Read in under 90 seconds.
 *
 * STANDARDS:
 *  1. Three headline numbers up top, plain text, each with a weekly delta
 *     phrased as "X.X% weekly increase / decrease" (no arrows).
 *  2. Insights paragraph: 4-6 short sentences in plain prose. Source split
 *     (paid search vs direct/organic), region coverage, top-performing
 *     region groups, one spotlight region with its constituent countries.
 *  3. Qualification rate by region group: USA & Canada / Europe & ROW /
 *     LATAM / Australia. Each line: "X% qualified out (Y% new/attempting,
 *     Z% engaged, A% qualified, B% not pursuing)".
 *  4. Advanced-stage leads: company + country bullets for deals at
 *     Contract Live / Onboarding / Achieving Impact stages.
 *  5. Closing line: "Pipeline value of $X and $Y of ARR created."
 *  6. Compact provenance footer (period, prior, comparison source).
 *  7. No TL;DR, scorecard, watch list, outlook, anomaly callouts —
 *     keep the recap tight. The Report tab covers the analyst view.
 *  8. Plain confident language. No fluff. No hedging. No causation
 *     hypotheses ("driven by", "because of") — attribution data isn't
 *     in this report.
 *  9. Numbers are sacred. Programmatic source of truth. LLM may not invent.
 *
 * SKELETON (fixed order):
 *   HEADER → 3 HEADLINE LINES → INSIGHTS → QUALIFICATION RATE →
 *   ADVANCED-STAGE LEADS → PIPELINE RESULT → FOOTER.
 *
 * LLM rewrites TWO prose zones:
 *   <!-- LLM:INSIGHTS -->...<!-- /LLM:INSIGHTS -->
 *   <!-- LLM:FORWARD_DEALS -->...<!-- /LLM:FORWARD_DEALS -->
 *
 * Validator rejects any LLM output containing numeric tokens not in the
 * programmatic whitelist. On failure, the route silently returns the
 * programmatic markdown unchanged.
 */

import type { Metrics, RegionGroup, RegionGroupBreakdown } from "../types";
import {
  deriveNarrativeFacts,
  type HeadlineFigure,
  type NarrativeFacts,
  type Spotlight,
} from "./executiveFacts";
import { fmtNumber } from "./format";

export interface ExecutiveBriefing {
  markdown: string;
  facts: NarrativeFacts;
}

export function renderExecutiveBriefing(m: Metrics): ExecutiveBriefing {
  const facts = deriveNarrativeFacts(m);
  const markdown = renderFromFacts(facts);
  return { markdown, facts };
}

export function renderExecutiveMarkdown(m: Metrics): string {
  return renderExecutiveBriefing(m).markdown;
}

function renderFromFacts(facts: NarrativeFacts): string {
  const lines: string[] = [];
  renderHeader(lines, facts);
  renderHeadlineLines(lines, facts);
  renderInsights(lines, facts);
  renderQualification(lines, facts);
  renderAdvancedStageDeals(lines, facts);
  renderClosing(lines, facts);
  renderFooter(lines, facts);
  return lines.join("\n");
}

function renderHeader(lines: string[], facts: NarrativeFacts): void {
  lines.push(`# High-level performance notes (${facts.period.range})`);
  pushWhitelist(facts, facts.period.range);
  lines.push("");
}

function renderHeadlineLines(lines: string[], facts: NarrativeFacts): void {
  lines.push(headlineLine(facts.headline.leads, `${facts.headline.leads.formatted} total inbound leads`));
  lines.push(headlineLine(facts.headline.spend, `${facts.headline.spend.formatted} in total ad spend`));
  lines.push(
    headlineLine(
      facts.headline.paidSearchCpl,
      facts.headline.paidSearchCpl.value != null
        ? `${facts.headline.paidSearchCpl.formatted} average cost per paid search lead`
        : `Average cost per paid search lead — no paid-search leads this period`,
    ),
  );
  pushFigureTokens(facts, facts.headline.leads);
  pushFigureTokens(facts, facts.headline.spend);
  pushFigureTokens(facts, facts.headline.paidSearchCpl);
  lines.push("");
}

function headlineLine(fig: HeadlineFigure, prefix: string): string {
  if (fig.value == null) return prefix;
  const tail = fig.formattedDelta.startsWith("(") ? fig.formattedDelta : `(${fig.formattedDelta})`;
  return `${prefix} ${tail}`;
}

function renderInsights(lines: string[], facts: NarrativeFacts): void {
  lines.push(`## Insights from ${facts.period.range}`);
  lines.push("");
  lines.push("<!-- LLM:INSIGHTS -->");
  for (const sentence of defaultInsightsSentences(facts)) {
    lines.push(sentence);
    pushTokensFromSentence(facts, sentence);
  }
  lines.push("<!-- /LLM:INSIGHTS -->");
  lines.push("");
}

function defaultInsightsSentences(facts: NarrativeFacts): string[] {
  const out: string[] = [];
  const { insights } = facts;

  if (insights.totalLeads === 0) {
    out.push("No inbound leads were captured during this period.");
    return out;
  }

  out.push(
    `${fmtNumber(insights.totalLeads)} total inbound leads this week — ${fmtNumber(insights.paidSearchLeads)} from paid search and ${fmtNumber(insights.directOrganicLeads)} from direct and organic traffic.`,
  );

  if (insights.inactiveRegionGroups.length > 0) {
    const list = listJoin(insights.inactiveRegionGroups.map(String));
    out.push(`All active region groups except ${list} saw lead volume this period.`);
  } else if (insights.activeRegionGroups.length > 0) {
    const list = listJoin(insights.activeRegionGroups.map(String));
    out.push(`Lead volume reached every active region group this period (${list}).`);
  }

  if (facts.hasPrior && insights.topMoverRegions.length > 0) {
    const movers = insights.topMoverRegions.map((m) => `${m.group} (+${m.deltaPct.toFixed(1)}%)`);
    out.push(`${listJoin(movers)} led week-over-week growth on lead volume.`);
  }

  if (insights.spotlight) {
    out.push(spotlightSentence(insights.spotlight, facts.hasPrior));
    if (insights.spotlight.countries.length > 0) {
      out.push(`The ${insights.spotlight.group} leads came from ${listJoin(insights.spotlight.countries)}.`);
    }
  }

  return out;
}

function spotlightSentence(sp: Spotlight, hasPrior: boolean): string {
  const qualifier = hasPrior ? "had its strongest week in the comparison window" : "led volume this week";
  const psPart = sp.paidSearchLeadCount > 0
    ? `, ${fmtNumber(sp.paidSearchLeadCount)} of them from paid search`
    : "";
  return `${sp.group} ${qualifier} with ${fmtNumber(sp.leadCount)} inbound leads${psPart}.`;
}

function listJoin(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function renderQualification(lines: string[], facts: NarrativeFacts): void {
  lines.push("## Qualification rate");
  lines.push("");
  if (facts.qualification.length === 0) {
    lines.push("_No lead-stage data available for this period._");
    lines.push("");
    return;
  }
  for (const row of facts.qualification) {
    lines.push(`- **${row.group}:** ${qualificationLine(row)}`);
    pushQualificationTokens(facts, row);
  }
  lines.push("");
}

function qualificationLine(row: RegionGroupBreakdown): string {
  const tail: string[] = [];
  const fmt = (label: string, val: number) => `${val.toFixed(1)}% ${label}`;
  if (row.stagePcts.newAttempting > 0) tail.push(fmt("new / attempting", row.stagePcts.newAttempting));
  if (row.stagePcts.engaged > 0) tail.push(fmt("engaged", row.stagePcts.engaged));
  if (row.stagePcts.qualified > 0) tail.push(fmt("qualified", row.stagePcts.qualified));
  if (row.stagePcts.notPursuing > 0) tail.push(fmt("not pursuing", row.stagePcts.notPursuing));
  const parens = tail.length > 0 ? ` (${tail.join(", ")})` : "";
  return `${row.qualifiedOutPct.toFixed(1)}% qualified out${parens}`;
}

function renderAdvancedStageDeals(lines: string[], facts: NarrativeFacts): void {
  lines.push("## Advanced-stage leads from this period");
  lines.push("");
  lines.push("<!-- LLM:FORWARD_DEALS -->");
  if (facts.advancedStageDeals.length === 0) {
    lines.push("_No leads progressed past Closed-Won this period._");
    lines.push("<!-- /LLM:FORWARD_DEALS -->");
    lines.push("");
    return;
  }
  const stageLabel = summariseStages(facts.advancedStageDeals.map((d) => d.stage));
  lines.push(`The following leads from this period are currently in the ${stageLabel} stage${facts.advancedStageDeals.length === 1 ? "" : "s"}:`);
  for (const d of facts.advancedStageDeals) {
    const country = d.country && d.country.trim() ? d.country.trim() : "country unknown";
    lines.push(`- ${d.company} (${country})`);
  }
  lines.push("<!-- /LLM:FORWARD_DEALS -->");
  lines.push("");
}

function summariseStages(stages: string[]): string {
  const unique = Array.from(new Set(stages.map((s) => s.trim()).filter(Boolean)));
  if (unique.length === 0) return "advanced";
  if (unique.length === 1) return `"${unique[0]}"`;
  if (unique.length === 2) return `"${unique[0]}" and "${unique[1]}"`;
  return `"${unique.slice(0, -1).join('", "')}", and "${unique[unique.length - 1]}"`;
}

function renderClosing(lines: string[], facts: NarrativeFacts): void {
  lines.push("## Pipeline result");
  lines.push("");
  const { pipelineValue, arrCreated, pipelineFormatted, arrFormatted } = facts.closing;
  if (pipelineValue === 0 && arrCreated === 0) {
    lines.push("No new pipeline or ARR was created from inbound leads this period.");
  } else if (arrCreated === 0) {
    lines.push(`The inbound leads generated this period produced a pipeline value of ${pipelineFormatted} and no ARR yet from this period's leads.`);
  } else {
    lines.push(`The inbound leads generated this period produced a pipeline value of ${pipelineFormatted} and ${arrFormatted} of ARR created.`);
  }
  pushWhitelist(facts, pipelineFormatted, arrFormatted);
  lines.push("");
}

function renderFooter(lines: string[], facts: NarrativeFacts): void {
  lines.push("---");
  const parts = [
    `Period: ${facts.period.range}`,
    `Prior: ${facts.period.priorRange}`,
    facts.period.comparisonNote,
  ];
  lines.push(`_${parts.join(" · ")}_`);
  pushWhitelist(facts, facts.period.priorRange);
}

function pushWhitelist(facts: NarrativeFacts, ...tokens: string[]): void {
  for (const t of tokens) {
    if (!t) continue;
    if (t === "—") continue;
    facts.numericWhitelist.push(t);
  }
}

function pushFigureTokens(facts: NarrativeFacts, fig: HeadlineFigure): void {
  pushWhitelist(facts, fig.formatted, fig.formattedDelta);
  if (fig.deltaPct != null) {
    pushWhitelist(facts, `${Math.abs(fig.deltaPct).toFixed(1)}%`);
  }
}

function pushQualificationTokens(facts: NarrativeFacts, row: RegionGroupBreakdown): void {
  facts.numericWhitelist.push(`${row.qualifiedOutPct.toFixed(1)}%`);
  facts.numericWhitelist.push(`${row.stagePcts.newAttempting.toFixed(1)}%`);
  facts.numericWhitelist.push(`${row.stagePcts.engaged.toFixed(1)}%`);
  facts.numericWhitelist.push(`${row.stagePcts.qualified.toFixed(1)}%`);
  facts.numericWhitelist.push(`${row.stagePcts.notPursuing.toFixed(1)}%`);
  facts.numericWhitelist.push(`${row.pct.toFixed(1)}%`);
  facts.numericWhitelist.push(String(row.count));
}

function pushTokensFromSentence(facts: NarrativeFacts, sentence: string): void {
  const tokenRe =
    /\$\s?-?\d[\d,]*(?:\.\d+)?[KMB]?|[+-]?\d+(?:\.\d+)?%|\d+(?:\.\d+)?|\d{1,3}(?:,\d{3})+/g;
  for (const m of sentence.matchAll(tokenRe)) {
    facts.numericWhitelist.push(m[0]);
  }
}

// Surface the RegionGroup type for downstream consumers.
export type { RegionGroup };
