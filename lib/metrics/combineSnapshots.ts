import type { ReportSnapshot } from "@prisma/client";
import type {
  AdvancedStageDeal,
  ChannelMetrics,
  CountryBreakdown,
  CountryChannelRow,
  CountryKey,
  HighValueDeal,
  Metrics,
  PeriodMetrics,
  RegionGroup,
  RegionGroupBreakdown,
  RegionStageCounts,
  SourceBreakdown,
  StageBreakdown,
} from "../types";
import { COUNTRY_ORDER } from "./paidMediaClassification";

const ALL_REGION_GROUPS: RegionGroup[] = [
  "USA & Canada",
  "Europe & ROW",
  "LATAM",
  "Australia",
];

export interface CombineRange {
  start: Date;
  end: Date;
}

/**
 * Aggregate a chronologically-ordered list of stored report snapshots into a
 * single PeriodMetrics covering the combined range. Caller is responsible for
 * having validated the tiling — overlaps will double-count.
 *
 * Sums additive fields, recomputes rates from summed numerator / denominator,
 * merges + re-sorts deal lists, and recomputes percentages against the new
 * totals. Region-group prior deltas are left null here and filled in by the
 * caller after a prior is identified.
 */
export function combinePeriodMetrics(periods: PeriodMetrics[]): PeriodMetrics {
  if (periods.length === 0) {
    throw new Error("combinePeriodMetrics: no input periods");
  }

  const sum = (pick: (p: PeriodMetrics) => number) =>
    periods.reduce((s, p) => s + (pick(p) || 0), 0);

  const inboundLeadCount = sum((p) => p.inboundLeadCount);
  const adSpend = sum((p) => p.adSpend);
  const totalDealValue = sum((p) => p.totalDealValue);
  const demoCount = sum((p) => p.demoCount);
  const negotiatingCount = sum((p) => p.negotiatingCount);
  const enteredContractLiveCount = sum((p) => p.enteredContractLiveCount);
  const paidSearchInboundLeads = sum((p) => p.paidSearchInboundLeads);
  const paidSearchSpend = sum((p) => p.paidSearchSpend);
  const directOrganicInboundLeads = sum((p) => p.directOrganicInboundLeads);
  const arrCreated = sum((p) => p.arrCreated);

  const paidSearchCostPerLead =
    paidSearchInboundLeads > 0 ? paidSearchSpend / paidSearchInboundLeads : null;
  // Match compute.ts: costPerLead is the paid-search figure.
  const costPerLead = paidSearchCostPerLead;
  const costPerDealDollar = totalDealValue > 0 ? adSpend / totalDealValue : null;

  const bySource = mergeBreakdown<SourceBreakdown>(
    periods.flatMap((p) => p.bySource ?? []),
    (b) => b.source,
    (key, count, pct) => ({ source: key, count, pct }),
  );
  const byStage = mergeBreakdown<StageBreakdown>(
    periods.flatMap((p) => p.byStage ?? []),
    (b) => b.stage,
    (key, count, pct) => ({ stage: key, count, pct }),
  );
  const byCountry = mergeBreakdown<CountryBreakdown>(
    periods.flatMap((p) => p.byCountry ?? []),
    (b) => b.country,
    (key, count, pct) => ({ country: key, count, pct }),
  );

  const paidMediaByCountry = mergePaidMediaByCountry(periods);
  const unclassifiedCampaigns = mergeUnclassifiedCampaigns(periods);

  const highValueDeals = mergeHighValueDeals(periods.flatMap((p) => p.highValueDeals ?? []));
  const enteredContractLiveDeals = mergeHighValueDeals(
    periods.flatMap((p) => p.enteredContractLiveDeals ?? []),
  );
  const advancedStageDeals = mergeAdvancedStageDeals(
    periods.flatMap((p) => p.advancedStageDeals ?? []),
  );

  const byRegionGroup = mergeRegionGroups(periods);
  const inactiveRegionGroups = inboundLeadCount > 0
    ? ALL_REGION_GROUPS.filter((g) => !byRegionGroup.some((r) => r.group === g && r.count > 0))
    : [];

  return {
    inboundLeadCount,
    bySource,
    byStage,
    byCountry,
    adSpend,
    totalDealValue,
    costPerLead,
    costPerDealDollar,
    highValueDeals,
    demoCount,
    negotiatingCount,
    enteredContractLiveCount,
    enteredContractLiveDeals,
    paidMediaByCountry,
    unclassifiedCampaigns,
    paidSearchInboundLeads,
    paidSearchSpend,
    paidSearchCostPerLead,
    directOrganicInboundLeads,
    arrCreated,
    byRegionGroup,
    inactiveRegionGroups,
    advancedStageDeals,
  };
}

/**
 * Build a full Metrics envelope from a tiling of snapshots. Prior period and
 * comparisonInfo are passed in by the caller — typically resolved via
 * findMatchingPriorSnapshot just like the upload flow does.
 */
export function combineSnapshotsToMetrics(
  snapshots: ReportSnapshot[],
  range: CombineRange,
  prior: PeriodMetrics | null,
  priorPeriodStart: Date,
  priorPeriodEnd: Date,
  priorSnapshot: { id: string; periodStart: Date; periodEnd: Date } | null,
): Metrics {
  const periodMetrics = snapshots.map((s) => {
    const m = s.metricsJson as unknown as Metrics;
    return m.current;
  });
  const current = combinePeriodMetrics(periodMetrics);

  if (prior) enrichRegionGroupDeltas(current, prior);

  const sourceWarnings = snapshots.flatMap((s) => {
    const m = s.metricsJson as unknown as Metrics;
    return m.warnings ?? [];
  });
  const dedupedWarnings = Array.from(new Set(sourceWarnings));
  const warnings = [
    `Combined from ${snapshots.length} stored report${snapshots.length === 1 ? "" : "s"}.`,
    ...dedupedWarnings,
  ];

  const adsPeriodLabels = snapshots
    .map((s) => (s.metricsJson as unknown as Metrics).adsPeriodLabel)
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  const adsPeriodLabel = adsPeriodLabels.length > 0 ? adsPeriodLabels.join(" + ") : null;

  return {
    current,
    prior,
    comparisonInfo: priorSnapshot
      ? {
          source: "stored_snapshot",
          snapshotId: priorSnapshot.id,
          snapshotPeriodStart: priorSnapshot.periodStart.toISOString(),
          snapshotPeriodEnd: priorSnapshot.periodEnd.toISOString(),
        }
      : { source: "none" },
    periodStart: range.start.toISOString(),
    periodEnd: range.end.toISOString(),
    priorPeriodStart: priorPeriodStart.toISOString(),
    priorPeriodEnd: priorPeriodEnd.toISOString(),
    adsPeriodLabel,
    warnings,
  };
}

function mergeBreakdown<T extends { count: number; pct: number }>(
  rows: T[],
  keyOf: (r: T) => string,
  build: (key: string, count: number, pct: number) => T,
): T[] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(keyOf(r), (counts.get(keyOf(r)) ?? 0) + r.count);
  const total = Array.from(counts.values()).reduce((s, v) => s + v, 0) || 1;
  return Array.from(counts.entries())
    .map(([key, count]) => build(key, count, (count / total) * 100))
    .sort((a, b) => b.count - a.count);
}

function emptyChannelMetrics(): ChannelMetrics {
  return { spend: 0, clicks: 0, impressions: 0, paidConversions: 0, inboundLeads: 0 };
}

function mergePaidMediaByCountry(periods: PeriodMetrics[]): CountryChannelRow[] {
  const map = new Map<CountryKey, CountryChannelRow>();
  for (const key of COUNTRY_ORDER) {
    map.set(key, {
      country: key,
      paidSearch: emptyChannelMetrics(),
      display: emptyChannelMetrics(),
    });
  }
  for (const p of periods) {
    for (const row of p.paidMediaByCountry ?? []) {
      const target = map.get(row.country);
      if (!target) continue;
      addChannel(target.paidSearch, row.paidSearch);
      addChannel(target.display, row.display);
    }
  }
  return COUNTRY_ORDER.map((k) => map.get(k)!);
}

function addChannel(dst: ChannelMetrics, src: ChannelMetrics): void {
  dst.spend += src.spend || 0;
  dst.clicks += src.clicks || 0;
  dst.impressions += src.impressions || 0;
  dst.paidConversions += src.paidConversions || 0;
  dst.inboundLeads += src.inboundLeads || 0;
}

function mergeUnclassifiedCampaigns(periods: PeriodMetrics[]): string[] {
  const set = new Set<string>();
  for (const p of periods) for (const name of p.unclassifiedCampaigns ?? []) set.add(name);
  return Array.from(set);
}

function mergeHighValueDeals(deals: HighValueDeal[]): HighValueDeal[] {
  const seen = new Map<string, HighValueDeal>();
  for (const d of deals) {
    const key = `${d.dealName}|${d.company}|${d.amount}|${d.createDate ?? ""}`;
    if (!seen.has(key)) seen.set(key, d);
  }
  return Array.from(seen.values()).sort((a, b) => b.amount - a.amount);
}

function mergeAdvancedStageDeals(deals: AdvancedStageDeal[]): AdvancedStageDeal[] {
  const seen = new Map<string, AdvancedStageDeal>();
  for (const d of deals) {
    const key = `${d.dealName}|${d.company}|${d.amount}|${d.stage}`;
    if (!seen.has(key)) seen.set(key, d);
  }
  return Array.from(seen.values()).sort((a, b) => b.amount - a.amount);
}

function emptyRegionStages(): RegionStageCounts {
  return { newAttempting: 0, engaged: 0, qualified: 0, notPursuing: 0, disqualified: 0, other: 0 };
}

function pctOf(n: number, denom: number): number {
  if (denom <= 0) return 0;
  return (n / denom) * 100;
}

function mergeRegionGroups(periods: PeriodMetrics[]): RegionGroupBreakdown[] {
  type Acc = {
    count: number;
    paidSearchLeads: number;
    directOrganicLeads: number;
    stages: RegionStageCounts;
    countries: Map<string, number>;
  };
  const byGroup = new Map<RegionGroup, Acc>();

  for (const p of periods) {
    for (const row of p.byRegionGroup ?? []) {
      const acc = byGroup.get(row.group) ?? {
        count: 0,
        paidSearchLeads: 0,
        directOrganicLeads: 0,
        stages: emptyRegionStages(),
        countries: new Map<string, number>(),
      };
      acc.count += row.count;
      acc.paidSearchLeads += row.paidSearchLeads;
      acc.directOrganicLeads += row.directOrganicLeads;
      acc.stages.newAttempting += row.stages.newAttempting;
      acc.stages.engaged += row.stages.engaged;
      acc.stages.qualified += row.stages.qualified;
      acc.stages.notPursuing += row.stages.notPursuing;
      acc.stages.disqualified += row.stages.disqualified;
      acc.stages.other += row.stages.other;
      for (const c of row.countries ?? []) {
        acc.countries.set(c.country, (acc.countries.get(c.country) ?? 0) + c.count);
      }
      byGroup.set(row.group, acc);
    }
  }

  const totalLeads = Array.from(byGroup.values()).reduce((s, a) => s + a.count, 0) || 1;
  const rows: RegionGroupBreakdown[] = [];
  for (const [group, acc] of byGroup.entries()) {
    const stagePcts: RegionStageCounts = {
      newAttempting: pctOf(acc.stages.newAttempting, acc.count),
      engaged: pctOf(acc.stages.engaged, acc.count),
      qualified: pctOf(acc.stages.qualified, acc.count),
      notPursuing: pctOf(acc.stages.notPursuing, acc.count),
      disqualified: pctOf(acc.stages.disqualified, acc.count),
      other: pctOf(acc.stages.other, acc.count),
    };
    const countries = Array.from(acc.countries.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
    rows.push({
      group,
      count: acc.count,
      pct: (acc.count / totalLeads) * 100,
      paidSearchLeads: acc.paidSearchLeads,
      directOrganicLeads: acc.directOrganicLeads,
      priorCount: null,
      deltaPct: null,
      stages: acc.stages,
      stagePcts,
      qualifiedOutPct: stagePcts.disqualified,
      countries,
    });
  }
  return rows.sort((a, b) => b.count - a.count);
}

// Mirrors enrichRegionGroupDeltas in lib/metrics/compute.ts so the combined
// report carries the same prior-comparison shape the dashboard expects.
function enrichRegionGroupDeltas(current: PeriodMetrics, prior: PeriodMetrics): void {
  if (!current.byRegionGroup || !prior.byRegionGroup) return;
  const priorMap = new Map(prior.byRegionGroup.map((r) => [r.group, r.count]));
  for (const row of current.byRegionGroup) {
    const priorCount = priorMap.get(row.group);
    if (priorCount == null) {
      row.priorCount = null;
      row.deltaPct = null;
      continue;
    }
    row.priorCount = priorCount;
    if (priorCount === 0) {
      row.deltaPct = row.count > 0 ? null : 0;
    } else {
      row.deltaPct = ((row.count - priorCount) / priorCount) * 100;
    }
  }
}
