import type {
  AdvancedStageDeal,
  Metrics,
  PeriodMetrics,
  RegionGroup,
  RegionGroupBreakdown,
} from "../types";
import { fmtDateRange, fmtMoney, fmtNumber } from "./format";

export type Direction = "up" | "down" | "flat" | "na";

export interface HeadlineFigure {
  value: number | null;
  deltaPct: number | null;
  direction: Direction;
  formatted: string;
  formattedDelta: string;
}

export interface Spotlight {
  group: RegionGroup;
  leadCount: number;
  paidSearchLeadCount: number;
  countries: string[];
}

export interface InsightsFacts {
  totalLeads: number;
  paidSearchLeads: number;
  directOrganicLeads: number;
  activeRegionGroups: RegionGroup[];
  inactiveRegionGroups: RegionGroup[];
  topMoverRegions: { group: RegionGroup; deltaPct: number; currCount: number; priorCount: number }[];
  spotlight: Spotlight | null;
}

export interface NarrativeFacts {
  period: { range: string; priorRange: string; comparisonNote: string };
  hasPrior: boolean;
  isFirstReport: boolean;

  headline: {
    leads: HeadlineFigure;
    spend: HeadlineFigure;
    paidSearchCpl: HeadlineFigure;
  };

  insights: InsightsFacts;
  qualification: RegionGroupBreakdown[];
  advancedStageDeals: AdvancedStageDeal[];

  closing: {
    pipelineValue: number;
    arrCreated: number;
    pipelineFormatted: string;
    arrFormatted: string;
  };

  numericWhitelist: string[];
}

export function deriveNarrativeFacts(m: Metrics): NarrativeFacts {
  const c = m.current ?? emptyPeriodMetrics();
  const p = m.prior;
  const hasPrior = p != null && m.comparisonInfo.source !== "none";

  const period = {
    range: fmtDateRange(m.periodStart, m.periodEnd),
    priorRange: fmtDateRange(m.priorPeriodStart, m.priorPeriodEnd),
    comparisonNote: comparisonSourceNote(m),
  };

  const headline = {
    leads: makeFigure(c.inboundLeadCount, hasPrior ? p!.inboundLeadCount : null, fmtNumber),
    spend: makeFigure(c.adSpend, hasPrior ? p!.adSpend : null, fmtMoney),
    paidSearchCpl: makeFigure(
      c.paidSearchCostPerLead,
      hasPrior ? (p!.paidSearchCostPerLead ?? null) : null,
      fmtMoney,
    ),
  };

  const insights = buildInsights(c, hasPrior);

  const qualification = (c.byRegionGroup ?? []).filter((r) => r.count > 0);

  const advancedStageDeals = c.advancedStageDeals ?? [];

  const closing = {
    pipelineValue: c.totalDealValue,
    arrCreated: c.arrCreated ?? 0,
    pipelineFormatted: fmtMoney(c.totalDealValue),
    arrFormatted: fmtMoney(c.arrCreated ?? 0),
  };

  return {
    period,
    hasPrior,
    isFirstReport: !hasPrior,
    headline,
    insights,
    qualification,
    advancedStageDeals,
    closing,
    numericWhitelist: [],
  };
}

function emptyPeriodMetrics(): PeriodMetrics {
  return {
    inboundLeadCount: 0,
    bySource: [],
    byStage: [],
    byCountry: [],
    adSpend: 0,
    totalDealValue: 0,
    costPerLead: null,
    costPerDealDollar: null,
    highValueDeals: [],
    demoCount: 0,
    negotiatingCount: 0,
    enteredContractLiveCount: 0,
    enteredContractLiveDeals: [],
    paidSearchInboundLeads: 0,
    paidSearchSpend: 0,
    paidSearchCostPerLead: null,
    directOrganicInboundLeads: 0,
    arrCreated: 0,
    byRegionGroup: [],
    inactiveRegionGroups: [],
    advancedStageDeals: [],
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

function makeFigure(
  value: number | null,
  prior: number | null,
  fmt: (n: number) => string,
): HeadlineFigure {
  if (value == null) {
    return {
      value: null,
      deltaPct: null,
      direction: "na",
      formatted: "—",
      formattedDelta: "(not available this period)",
    };
  }
  const formatted = fmt(value);
  if (prior == null) {
    return { value, deltaPct: null, direction: "na", formatted, formattedDelta: "(baseline)" };
  }
  if (prior === 0) {
    if (value === 0) {
      return { value, deltaPct: 0, direction: "flat", formatted, formattedDelta: "no change vs prior 0" };
    }
    return { value, deltaPct: null, direction: "up", formatted, formattedDelta: "(new — prior was 0)" };
  }
  const pct = ((value - prior) / prior) * 100;
  const direction: Direction = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const word = pct > 0 ? "weekly increase" : pct < 0 ? "weekly decrease" : "no weekly change";
  const pctStr = `${Math.abs(pct).toFixed(1)}%`;
  return {
    value,
    deltaPct: pct,
    direction,
    formatted,
    formattedDelta: pct === 0 ? word : `${pctStr} ${word}`,
  };
}

function buildInsights(c: PeriodMetrics, hasPrior: boolean): InsightsFacts {
  const byRegionGroup = c.byRegionGroup ?? [];
  const activeRegionGroups = byRegionGroup
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((r) => r.group);
  const inactiveRegionGroups = c.inactiveRegionGroups ?? [];

  const topMoverRegions = hasPrior
    ? byRegionGroup
        .filter((r) => r.deltaPct != null && r.deltaPct > 0 && r.count >= 3)
        .sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0))
        .slice(0, 2)
        .map((r) => ({
          group: r.group,
          deltaPct: r.deltaPct as number,
          currCount: r.count,
          priorCount: r.priorCount ?? 0,
        }))
    : [];

  const spotlight = findSpotlight(byRegionGroup, hasPrior);

  return {
    totalLeads: c.inboundLeadCount,
    paidSearchLeads: c.paidSearchInboundLeads,
    directOrganicLeads: c.directOrganicInboundLeads,
    activeRegionGroups,
    inactiveRegionGroups,
    topMoverRegions,
    spotlight,
  };
}

function findSpotlight(byRegionGroup: RegionGroupBreakdown[], hasPrior: boolean): Spotlight | null {
  // Spotlight = the largest positive deltaPct region group with count >= 5, OR
  // if no prior data, the largest group by count provided count >= 5.
  const candidates = byRegionGroup.filter((r) => r.count >= 5);
  if (candidates.length === 0) return null;
  let pick: RegionGroupBreakdown | null = null;
  if (hasPrior) {
    const movers = candidates.filter((r) => r.deltaPct != null && r.deltaPct > 0);
    if (movers.length > 0) {
      pick = movers.reduce((best, r) => ((r.deltaPct ?? 0) > (best.deltaPct ?? 0) ? r : best), movers[0]);
    }
  }
  if (!pick) {
    pick = candidates.reduce((best, r) => (r.count > best.count ? r : best), candidates[0]);
  }
  if (!pick) return null;
  return {
    group: pick.group,
    leadCount: pick.count,
    paidSearchLeadCount: pick.paidSearchLeads,
    countries: pick.countries.map((c) => c.country).slice(0, 8),
  };
}
