import type { HighValueDeal, Metrics, PeriodMetrics, SourceBreakdown, CountryBreakdown } from "../types";
import { fmtDateRange, fmtMoney, fmtNumber, fmtPct } from "./format";

export type Direction = "up" | "down" | "flat" | "na";
export type Arrow = "▲" | "▼" | "→" | "—";

export interface DeltaPct {
  curr: number;
  prior: number | null;
  pctChange: number | null;
  absChange: number;
  direction: Direction;
  arrow: Arrow;
  formattedCurr: string;
  formattedPrior: string;
  formattedDelta: string;
}

export type ScorecardKey =
  | "inboundLeads"
  | "adSpend"
  | "pipelineValue"
  | "costPerLead"
  | "spendPerPipelineDollar"
  | "demoCount"
  | "negotiatingCount"
  | "contractLiveEntries";

export interface ScorecardRow {
  key: ScorecardKey;
  label: string;
  delta: DeltaPct;
  isCurrency: boolean;
  isAvailable: boolean;
}

export interface Mover {
  dimension: "source" | "country";
  key: string;
  currCount: number;
  priorCount: number;
  absChange: number;
  pctChange: number | null;
  direction: Direction;
  isNew: boolean;
  isLost: boolean;
  formattedDelta: string;
}

export type AnomalyId =
  | "leadsDownBig"
  | "cplUpBig"
  | "spendSwing"
  | "noPipeline"
  | "demoStalled"
  | "parseWarnings";

export interface Anomaly {
  id: AnomalyId;
  severity: "watch" | "alert";
  message: string;
}

export type HeadlineKind =
  | "leadsAndSpend"
  | "efficiencyWin"
  | "efficiencyLoss"
  | "volumeShift"
  | "spendShift"
  | "pipelineMomentum"
  | "firstReport"
  | "steady";

export interface HeadlineSignal {
  kind: HeadlineKind;
  sentence: string;
}

export interface TopHighValueDeal {
  dealName: string;
  company: string;
  amount: number;
  amountFormatted: string;
  stage: string;
}

export interface ExecutiveFacts {
  period: { current: string; prior: string; adsLabel: string | null };
  comparisonNote: string;
  hasPrior: boolean;
  isFirstReport: boolean;

  headline: HeadlineSignal;
  tldr: string[];

  scorecard: ScorecardRow[];

  topMovers: Mover[];
  newEntries: Mover[];
  lostEntries: Mover[];

  pipeline: {
    demo: DeltaPct;
    negotiating: DeltaPct;
    contractLiveEntries: DeltaPct;
    contractLiveDeals: TopHighValueDeal[];
  };

  highValue: {
    count: number;
    totalAmount: number;
    totalFormatted: string;
    topDeals: TopHighValueDeal[];
  };

  efficiency: {
    cpl: DeltaPct;
    spendPerPipelineDollar: DeltaPct;
    pipelinePerSpendDollar: DeltaPct;
    sentence: string;
  };

  anomalies: Anomaly[];
  warnings: string[];

  numericWhitelist: string[];
}

const NEW_ENTRY_THRESHOLD = 3;

export function deriveExecutiveFacts(m: Metrics): ExecutiveFacts {
  const c = m.current;
  const p = m.prior;
  const hasPrior = p != null && m.comparisonInfo.source !== "none";

  const period = {
    current: fmtDateRange(m.periodStart, m.periodEnd),
    prior: fmtDateRange(m.priorPeriodStart, m.priorPeriodEnd),
    adsLabel: m.adsPeriodLabel,
  };

  const comparisonNote = comparisonSourceNote(m);

  const scorecard = buildScorecard(c, p, hasPrior);
  const leadsDelta = scorecard.find((r) => r.key === "inboundLeads")!.delta;
  const spendDelta = scorecard.find((r) => r.key === "adSpend")!.delta;
  const pipelineDelta = scorecard.find((r) => r.key === "pipelineValue")!.delta;
  const cplDelta = scorecard.find((r) => r.key === "costPerLead")!.delta;
  const sppDelta = scorecard.find((r) => r.key === "spendPerPipelineDollar")!.delta;
  const demoDelta = scorecard.find((r) => r.key === "demoCount")!.delta;
  const negDelta = scorecard.find((r) => r.key === "negotiatingCount")!.delta;
  const contractDelta = scorecard.find((r) => r.key === "contractLiveEntries")!.delta;

  const movers = computeMovers(c, p, hasPrior);

  const contractLiveDeals = (c.enteredContractLiveDeals ?? []).slice(0, 5).map(toTopDeal);
  const sortedHighValue = [...(c.highValueDeals ?? [])].sort((a, b) => b.amount - a.amount);
  const highValueTotal = sortedHighValue.reduce((sum, d) => sum + d.amount, 0);

  const efficiency = buildEfficiency(c, p, hasPrior, cplDelta, sppDelta);

  const anomalies = hasPrior ? detectAnomalies(c, p as PeriodMetrics, leadsDelta, cplDelta, spendDelta, demoDelta, negDelta) : [];
  if (m.warnings && m.warnings.length > 0) {
    anomalies.push({
      id: "parseWarnings",
      severity: "watch",
      message: `${m.warnings.length} parse warning${m.warnings.length === 1 ? "" : "s"} on source data — see footer.`,
    });
  }

  const headline = buildHeadline({
    hasPrior,
    leads: leadsDelta,
    spend: spendDelta,
    pipeline: pipelineDelta,
    cpl: cplDelta,
    contract: contractDelta,
    contractLiveCount: c.enteredContractLiveCount,
  });

  const tldr = buildTldr({
    leads: leadsDelta,
    spend: spendDelta,
    pipeline: pipelineDelta,
    cpl: cplDelta,
    contract: contractDelta,
    contractLiveCount: c.enteredContractLiveCount,
    anomalies,
    highValueCount: sortedHighValue.length,
    highValueTotalFormatted: fmtMoney(highValueTotal),
    hasPrior,
  });

  return {
    period,
    comparisonNote,
    hasPrior,
    isFirstReport: !hasPrior,
    headline,
    tldr,
    scorecard,
    topMovers: movers.topMovers,
    newEntries: movers.newEntries,
    lostEntries: movers.lostEntries,
    pipeline: {
      demo: demoDelta,
      negotiating: negDelta,
      contractLiveEntries: contractDelta,
      contractLiveDeals,
    },
    highValue: {
      count: sortedHighValue.length,
      totalAmount: highValueTotal,
      totalFormatted: fmtMoney(highValueTotal),
      topDeals: sortedHighValue.slice(0, 5).map(toTopDeal),
    },
    efficiency,
    anomalies,
    warnings: m.warnings ?? [],
    numericWhitelist: [],
  };
}

function comparisonSourceNote(m: Metrics): string {
  switch (m.comparisonInfo.source) {
    case "current_upload":
      return "vs prior period (derived from this upload)";
    case "stored_snapshot":
      return "vs prior period (from stored snapshot)";
    default:
      return "no prior period available";
  }
}

function toTopDeal(d: HighValueDeal): TopHighValueDeal {
  return {
    dealName: d.dealName,
    company: d.company,
    amount: d.amount,
    amountFormatted: fmtMoney(d.amount),
    stage: d.stage,
  };
}

function buildScorecard(c: PeriodMetrics, p: PeriodMetrics | null, hasPrior: boolean): ScorecardRow[] {
  const rows: ScorecardRow[] = [];

  rows.push({
    key: "inboundLeads",
    label: "Inbound leads",
    delta: deltaCount(c.inboundLeadCount, hasPrior ? p!.inboundLeadCount : null),
    isCurrency: false,
    isAvailable: true,
  });

  rows.push({
    key: "adSpend",
    label: "Ad spend",
    delta: deltaMoneyDetailed(c.adSpend, hasPrior ? p!.adSpend : null),
    isCurrency: true,
    isAvailable: true,
  });

  rows.push({
    key: "pipelineValue",
    label: "Pipeline created",
    delta: deltaMoneyDetailed(c.totalDealValue, hasPrior ? p!.totalDealValue : null),
    isCurrency: true,
    isAvailable: true,
  });

  const cplAvailable = c.costPerLead != null;
  rows.push({
    key: "costPerLead",
    label: "Cost per lead",
    delta: cplAvailable
      ? deltaMoneyDetailed(c.costPerLead as number, hasPrior ? p!.costPerLead : null)
      : naDelta(),
    isCurrency: true,
    isAvailable: cplAvailable,
  });

  const sppAvailable = c.costPerDealDollar != null;
  rows.push({
    key: "spendPerPipelineDollar",
    label: "Spend per pipeline $",
    delta: sppAvailable
      ? deltaRatio(c.costPerDealDollar as number, hasPrior ? p!.costPerDealDollar : null)
      : naDelta(),
    isCurrency: false,
    isAvailable: sppAvailable,
  });

  rows.push({
    key: "demoCount",
    label: "In DEMO",
    delta: deltaCount(c.demoCount, hasPrior ? p!.demoCount : null),
    isCurrency: false,
    isAvailable: true,
  });

  rows.push({
    key: "negotiatingCount",
    label: "In NEGOTIATING",
    delta: deltaCount(c.negotiatingCount, hasPrior ? p!.negotiatingCount : null),
    isCurrency: false,
    isAvailable: true,
  });

  rows.push({
    key: "contractLiveEntries",
    label: "New Contract Live",
    delta: deltaCount(c.enteredContractLiveCount, hasPrior ? p!.enteredContractLiveCount : null),
    isCurrency: false,
    isAvailable: true,
  });

  return rows;
}

function deltaCount(curr: number, prior: number | null): DeltaPct {
  return makeDelta(curr, prior, fmtNumber);
}

function deltaMoneyDetailed(curr: number, prior: number | null): DeltaPct {
  return makeDelta(curr, prior, fmtMoney);
}

function deltaRatio(curr: number, prior: number | null): DeltaPct {
  return makeDelta(curr, prior, (n) => n.toFixed(3));
}

function naDelta(): DeltaPct {
  return {
    curr: 0,
    prior: null,
    pctChange: null,
    absChange: 0,
    direction: "na",
    arrow: "—",
    formattedCurr: "—",
    formattedPrior: "—",
    formattedDelta: "—",
  };
}

function makeDelta(curr: number, prior: number | null, fmt: (n: number) => string): DeltaPct {
  const formattedCurr = fmt(curr);
  if (prior == null) {
    return {
      curr,
      prior: null,
      pctChange: null,
      absChange: 0,
      direction: "na",
      arrow: "—",
      formattedCurr,
      formattedPrior: "—",
      formattedDelta: "—",
    };
  }
  const absChange = curr - prior;
  const formattedPrior = fmt(prior);
  if (prior === 0) {
    const isNew = curr > 0;
    return {
      curr,
      prior: 0,
      pctChange: null,
      absChange,
      direction: isNew ? "up" : "flat",
      arrow: isNew ? "▲" : "→",
      formattedCurr,
      formattedPrior,
      formattedDelta: isNew ? `(new — prior was ${formattedPrior})` : `→ 0`,
    };
  }
  const pct = ((curr - prior) / prior) * 100;
  const arrow: Arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "→";
  const direction: Direction = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const sign = pct > 0 ? "+" : "";
  return {
    curr,
    prior,
    pctChange: pct,
    absChange,
    direction,
    arrow,
    formattedCurr,
    formattedPrior,
    formattedDelta: `${arrow} ${sign}${pct.toFixed(1)}%`,
  };
}

function computeMovers(
  c: PeriodMetrics,
  p: PeriodMetrics | null,
  hasPrior: boolean,
): { topMovers: Mover[]; newEntries: Mover[]; lostEntries: Mover[] } {
  if (!hasPrior || !p) return { topMovers: [], newEntries: [], lostEntries: [] };

  const sourceMovers = buildDimensionMovers<SourceBreakdown>(
    "source",
    c.bySource ?? [],
    p.bySource ?? [],
    (r) => r.source,
  );
  const countryMovers = buildDimensionMovers<CountryBreakdown>(
    "country",
    c.byCountry ?? [],
    p.byCountry ?? [],
    (r) => r.country,
  );
  const all = [...sourceMovers, ...countryMovers];

  const topMovers = all
    .filter((mv) => mv.priorCount > 0 && mv.currCount > 0 && isMeaningfulKey(mv.key))
    .sort((a, b) => Math.abs(b.absChange) - Math.abs(a.absChange))
    .slice(0, 3);

  const newEntries = all
    .filter((mv) => mv.isNew && mv.currCount >= NEW_ENTRY_THRESHOLD && isMeaningfulKey(mv.key))
    .sort((a, b) => b.currCount - a.currCount)
    .slice(0, 2);

  const lostEntries = all
    .filter((mv) => mv.isLost && mv.priorCount >= NEW_ENTRY_THRESHOLD && isMeaningfulKey(mv.key))
    .sort((a, b) => b.priorCount - a.priorCount)
    .slice(0, 2);

  return { topMovers, newEntries, lostEntries };
}

function isMeaningfulKey(key: string): boolean {
  const k = key.trim().toLowerCase();
  return k !== "" && k !== "unknown" && k !== "n/a" && k !== "—";
}

function buildDimensionMovers<T extends { count: number }>(
  dimension: "source" | "country",
  curr: T[],
  prior: T[],
  keyOf: (r: T) => string,
): Mover[] {
  const priorMap = new Map(prior.map((r) => [keyOf(r), r.count]));
  const currKeys = new Set(curr.map((r) => keyOf(r)));
  const movers: Mover[] = [];

  for (const row of curr) {
    const key = keyOf(row);
    const priorCount = priorMap.get(key) ?? 0;
    movers.push(makeMover(dimension, key, row.count, priorCount));
  }
  for (const row of prior) {
    const key = keyOf(row);
    if (currKeys.has(key)) continue;
    movers.push(makeMover(dimension, key, 0, row.count));
  }
  return movers;
}

function makeMover(dimension: "source" | "country", key: string, currCount: number, priorCount: number): Mover {
  const absChange = currCount - priorCount;
  const isNew = priorCount === 0 && currCount > 0;
  const isLost = currCount === 0 && priorCount > 0;
  let pctChange: number | null = null;
  let direction: Direction = "flat";
  let formattedDelta = "→ 0";
  if (priorCount > 0 && currCount > 0) {
    pctChange = ((currCount - priorCount) / priorCount) * 100;
    direction = pctChange > 0 ? "up" : pctChange < 0 ? "down" : "flat";
    const arrow: Arrow = pctChange > 0 ? "▲" : pctChange < 0 ? "▼" : "→";
    const sign = pctChange > 0 ? "+" : "";
    formattedDelta = `${arrow} ${sign}${pctChange.toFixed(1)}%`;
  } else if (isNew) {
    direction = "up";
    formattedDelta = `(new)`;
  } else if (isLost) {
    direction = "down";
    formattedDelta = `(was ${fmtNumber(priorCount)})`;
  }
  return {
    dimension,
    key,
    currCount,
    priorCount,
    absChange,
    pctChange,
    direction,
    isNew,
    isLost,
    formattedDelta,
  };
}

function buildEfficiency(
  c: PeriodMetrics,
  p: PeriodMetrics | null,
  hasPrior: boolean,
  cpl: DeltaPct,
  spp: DeltaPct,
): ExecutiveFacts["efficiency"] {
  const pipelinePerSpendDollar = makePipelinePerSpend(c, p, hasPrior);
  const sentence = buildEfficiencySentence(c);
  return { cpl, spendPerPipelineDollar: spp, pipelinePerSpendDollar, sentence };
}

function makePipelinePerSpend(c: PeriodMetrics, p: PeriodMetrics | null, hasPrior: boolean): DeltaPct {
  const ratio = (period: PeriodMetrics): number | null => {
    if (period.adSpend <= 0) return null;
    return period.totalDealValue / period.adSpend;
  };
  const curr = ratio(c);
  const prior = hasPrior && p ? ratio(p) : null;
  if (curr == null) return naDelta();
  return makeDelta(curr, prior, (n) => `$${n.toFixed(2)}`);
}

function buildEfficiencySentence(c: PeriodMetrics): string {
  const spendStr = fmtMoney(c.adSpend);
  const leadsStr = fmtNumber(c.inboundLeadCount);
  const pipelineStr = fmtMoney(c.totalDealValue);
  const cplStr = c.costPerLead != null ? fmtMoney(c.costPerLead) : "—";
  return `${spendStr} spend produced ${leadsStr} leads and ${pipelineStr} in pipeline at ${cplStr} per lead.`;
}

function detectAnomalies(
  c: PeriodMetrics,
  p: PeriodMetrics,
  leads: DeltaPct,
  cpl: DeltaPct,
  spend: DeltaPct,
  demo: DeltaPct,
  negotiating: DeltaPct,
): Anomaly[] {
  const out: Anomaly[] = [];

  if (leads.pctChange != null && leads.pctChange <= -25 && p.inboundLeadCount > 0) {
    out.push({
      id: "leadsDownBig",
      severity: "alert",
      message: `Inbound leads down ${fmtPct(Math.abs(leads.pctChange))} (${fmtNumber(c.inboundLeadCount)} vs ${fmtNumber(p.inboundLeadCount)}).`,
    });
  }

  if (cpl.pctChange != null && cpl.pctChange >= 20 && p.costPerLead != null && p.costPerLead > 0) {
    out.push({
      id: "cplUpBig",
      severity: "alert",
      message: `Cost per lead up ${fmtPct(cpl.pctChange)} to ${fmtMoney(c.costPerLead ?? 0)} (was ${fmtMoney(p.costPerLead)}).`,
    });
  }

  if (spend.pctChange != null && Math.abs(spend.pctChange) >= 50 && p.adSpend > 0) {
    const dir = spend.pctChange > 0 ? "up" : "down";
    out.push({
      id: "spendSwing",
      severity: "watch",
      message: `Ad spend ${dir} ${fmtPct(Math.abs(spend.pctChange))} (${fmtMoney(c.adSpend)} vs ${fmtMoney(p.adSpend)}).`,
    });
  }

  if (c.totalDealValue === 0 && p.totalDealValue > 0) {
    out.push({
      id: "noPipeline",
      severity: "alert",
      message: `Zero pipeline created this period (prior: ${fmtMoney(p.totalDealValue)}).`,
    });
  }

  if (c.demoCount > 0 && demo.pctChange === 0 && (negotiating.pctChange == null || negotiating.pctChange <= 0)) {
    out.push({
      id: "demoStalled",
      severity: "watch",
      message: `DEMO stage held at ${fmtNumber(c.demoCount)}; no forward motion into NEGOTIATING.`,
    });
  }

  return out;
}

function buildHeadline(opts: {
  hasPrior: boolean;
  leads: DeltaPct;
  spend: DeltaPct;
  pipeline: DeltaPct;
  cpl: DeltaPct;
  contract: DeltaPct;
  contractLiveCount: number;
}): HeadlineSignal {
  const { hasPrior, leads, spend, pipeline, cpl, contract, contractLiveCount } = opts;

  if (!hasPrior) {
    return {
      kind: "firstReport",
      sentence: `First report in the stack — establishing baselines at ${leads.formattedCurr} inbound leads, ${spend.formattedCurr} spend, and ${pipeline.formattedCurr} pipeline.`,
    };
  }

  const cplPct = cpl.pctChange;
  const leadsPct = leads.pctChange;
  const spendPct = spend.pctChange;
  const pipelinePct = pipeline.pctChange;
  const contractPct = contract.pctChange;

  if (cplPct != null && cplPct >= 20 && leadsPct != null && leadsPct <= 0) {
    return {
      kind: "efficiencyLoss",
      sentence: `Cost per lead climbed ${cpl.formattedDelta} to ${cpl.formattedCurr} while volume held ${leads.formattedDelta} (${leads.formattedCurr}) — efficiency is the watch-item this week.`,
    };
  }

  if (cplPct != null && cplPct <= -15 && leadsPct != null && leadsPct >= 0) {
    return {
      kind: "efficiencyWin",
      sentence: `Cost per lead dropped ${cpl.formattedDelta} to ${cpl.formattedCurr} on ${leads.formattedDelta} volume — paid is buying more for less.`,
    };
  }

  if (leadsPct != null && Math.abs(leadsPct) >= 25) {
    return {
      kind: "volumeShift",
      sentence: `Inbound volume ${leads.formattedDelta} to ${leads.formattedCurr} leads vs prior ${leads.formattedPrior}.`,
    };
  }

  if (spendPct != null && Math.abs(spendPct) >= 50) {
    return {
      kind: "spendShift",
      sentence: `Ad spend ${spend.formattedDelta} to ${spend.formattedCurr} from ${spend.formattedPrior}.`,
    };
  }

  if (contractLiveCount > 0 && (contract.prior === 0 || (contractPct != null && contractPct >= 50))) {
    return {
      kind: "pipelineMomentum",
      sentence: `${fmtNumber(contractLiveCount)} deal${contractLiveCount === 1 ? "" : "s"} moved into Contract Live this week (${contract.formattedDelta}).`,
    };
  }

  if (leadsPct != null && Math.abs(leadsPct) >= 10 && spendPct != null && Math.abs(spendPct) >= 10) {
    return {
      kind: "leadsAndSpend",
      sentence: `Leads ${leads.formattedDelta} to ${leads.formattedCurr} on ${spend.formattedDelta} spend (${spend.formattedCurr}); pipeline ${pipeline.formattedDelta} to ${pipeline.formattedCurr}.`,
    };
  }

  return {
    kind: "steady",
    sentence: `Steady week — ${leads.formattedCurr} leads, ${spend.formattedCurr} spend, ${pipeline.formattedCurr} pipeline; no signals outside normal range.`,
  };
}

function buildTldr(opts: {
  leads: DeltaPct;
  spend: DeltaPct;
  pipeline: DeltaPct;
  cpl: DeltaPct;
  contract: DeltaPct;
  contractLiveCount: number;
  anomalies: Anomaly[];
  highValueCount: number;
  highValueTotalFormatted: string;
  hasPrior: boolean;
}): string[] {
  const { leads, spend, pipeline, cpl, contract, contractLiveCount, anomalies, highValueCount, highValueTotalFormatted, hasPrior } = opts;

  const bullets: string[] = [];

  if (hasPrior) {
    bullets.push(`**${leads.formattedCurr} inbound leads** (${leads.formattedDelta} vs ${leads.formattedPrior}).`);
    bullets.push(`**${spend.formattedCurr} spend** at ${cpl.formattedCurr}/lead (${cpl.formattedDelta}).`);
    bullets.push(`**${pipeline.formattedCurr} pipeline created** (${pipeline.formattedDelta}).`);
  } else {
    bullets.push(`**${leads.formattedCurr} inbound leads** generated.`);
    bullets.push(`**${spend.formattedCurr} spend** at ${cpl.formattedCurr}/lead.`);
    bullets.push(`**${pipeline.formattedCurr} pipeline created**.`);
  }

  if (contractLiveCount > 0 && bullets.length < 5) {
    const tail = hasPrior && contract.formattedDelta !== "—" ? ` (${contract.formattedDelta})` : "";
    bullets.push(`**${fmtNumber(contractLiveCount)} deal${contractLiveCount === 1 ? "" : "s"}** into Contract Live${tail}.`);
  }

  const firstAlert = anomalies.find((a) => a.severity === "alert");
  if (firstAlert && bullets.length < 5) {
    bullets.push(`⚠ ${firstAlert.message}`);
  }

  if (highValueCount > 0 && bullets.length < 5) {
    bullets.push(`**${fmtNumber(highValueCount)} high-value deal${highValueCount === 1 ? "" : "s"}** > $15K (${highValueTotalFormatted} total).`);
  }

  return bullets.slice(0, 5);
}
