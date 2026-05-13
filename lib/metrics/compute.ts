import type {
  AdvancedStageDeal,
  Campaign,
  ChannelMetrics,
  ComparisonInfo,
  CountryBreakdown,
  CountryChannelRow,
  CountryKey,
  DateRange,
  Deal,
  HighValueDeal,
  Lead,
  Metrics,
  ParsedDatasets,
  PeriodMetrics,
  RegionGroup,
  RegionGroupBreakdown,
  RegionStageCounts,
  SourceBreakdown,
  StageBreakdown,
} from "../types";
import { HIGH_VALUE_THRESHOLD } from "../types";
import { matchStage } from "./matchStage";
import {
  COUNTRY_ORDER,
  classifyCampaignChannel,
  classifyCampaignCountry,
  classifyLeadChannel,
  classifyLeadCountry,
} from "./paidMediaClassification";

const REGION_GROUP_MAP: Record<CountryKey, RegionGroup> = {
  USA: "USA & Canada",
  Canada: "USA & Canada",
  UK: "Europe & ROW",
  France: "Europe & ROW",
  DACH: "Europe & ROW",
  Spain: "Europe & ROW",
  Nordics: "Europe & ROW",
  Netherlands: "Europe & ROW",
  Italy: "Europe & ROW",
  LATAM: "LATAM",
  Australia: "Australia",
};

const ALL_REGION_GROUPS: RegionGroup[] = ["USA & Canada", "Europe & ROW", "LATAM", "Australia"];

export interface ComputeOptions {
  range: DateRange;
  priorSnapshotMetrics?: PeriodMetrics | null;
  priorSnapshot?: { id: string; periodStart: Date; periodEnd: Date } | null;
}

export function compute(datasets: ParsedDatasets, opts: ComputeOptions): Metrics {
  const { range, priorSnapshotMetrics, priorSnapshot } = opts;
  const duration = range.end.getTime() - range.start.getTime();
  const priorRange: DateRange = {
    start: new Date(range.start.getTime() - duration),
    end: range.start,
  };

  const current = computeForPeriod(datasets, range);
  let prior: PeriodMetrics | null = null;
  let comparisonInfo: ComparisonInfo;

  const priorFromUpload = computeForPeriod(datasets, priorRange);
  if (datasetsCoverRange(datasets, priorRange)) {
    prior = priorFromUpload;
    comparisonInfo = { source: "current_upload" };
  } else if (priorSnapshotMetrics && priorSnapshot) {
    prior = priorSnapshotMetrics;
    comparisonInfo = {
      source: "stored_snapshot",
      snapshotId: priorSnapshot.id,
      snapshotPeriodStart: priorSnapshot.periodStart.toISOString(),
      snapshotPeriodEnd: priorSnapshot.periodEnd.toISOString(),
    };
  } else {
    comparisonInfo = { source: "none" };
  }

  if (prior) {
    enrichRegionGroupDeltas(current, prior);
  }

  return {
    current,
    prior,
    comparisonInfo,
    periodStart: range.start.toISOString(),
    periodEnd: range.end.toISOString(),
    priorPeriodStart: priorRange.start.toISOString(),
    priorPeriodEnd: priorRange.end.toISOString(),
    adsPeriodLabel: datasets.adsPeriodLabel,
    warnings: datasets.warnings,
  };
}

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

function computeForPeriod(datasets: ParsedDatasets, range: DateRange): PeriodMetrics {
  const leadsInRangeAll = datasets.leads.filter((l) => inRange(l.createDate, range));
  const leadsInRange = leadsInRangeAll.filter((l) => l.source != null && l.source.trim() !== "");
  const inboundLeadCount = uniqueById(leadsInRange).length;

  const bySource = breakdownBySource(leadsInRange);
  const byStage = breakdownByLeadStage(leadsInRange);
  const byCountry = breakdownByCountry(leadsInRange);

  const adSpend = datasets.campaigns.reduce((s, c) => s + (c.cost || 0), 0);

  const { rows: paidMediaByCountry, unclassified: unclassifiedCampaigns } =
    buildPaidMediaByCountry(datasets.campaigns, leadsInRangeAll);

  const dealsInRange = datasets.paidPipeDeals.filter((d) => inRange(d.createDate, range));
  const totalDealValue = dealsInRange.reduce((s, d) => s + (d.amount ?? 0), 0);

  const costPerLead = inboundLeadCount > 0 ? adSpend / inboundLeadCount : null;
  const costPerDealDollar = totalDealValue > 0 ? adSpend / totalDealValue : null;

  const highValueDeals = dealsInRange
    .filter((d) => (d.amount ?? 0) > HIGH_VALUE_THRESHOLD)
    .map(toHighValue)
    .sort((a, b) => b.amount - a.amount);

  const stageDealsForCounts = mergeDealLists([
    datasets.paidPipeDeals,
    datasets.leadStageDeals,
    datasets.regionalDeals,
  ]);

  const demoCount = stageDealsForCounts.filter((d) => matchStage(d.dealStage, "demo")).length;
  const negotiatingCount = stageDealsForCounts.filter((d) =>
    matchStage(d.dealStage, "negotiating"),
  ).length;

  const enteredContractLive = datasets.closedWonDeals.filter(
    (d) => matchStage(d.dealStage, "contract_live") && inRange(d.closeDate, range),
  );

  const paidSearchTotals = buildPaidSearchTotals(leadsInRange, paidMediaByCountry);
  const byRegionGroup = buildRegionGroupBreakdown(leadsInRange);
  const inactiveRegionGroups = inboundLeadCount > 0
    ? ALL_REGION_GROUPS.filter((g) => !byRegionGroup.some((r) => r.group === g && r.count > 0))
    : [];
  const arrCreated = buildArrCreated(datasets, range);
  const advancedStageDeals = buildAdvancedStageDeals(datasets, range);

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
    enteredContractLiveCount: enteredContractLive.length,
    enteredContractLiveDeals: enteredContractLive.map(toHighValue),
    paidMediaByCountry,
    unclassifiedCampaigns,
    paidSearchInboundLeads: paidSearchTotals.paidSearchInboundLeads,
    paidSearchSpend: paidSearchTotals.paidSearchSpend,
    paidSearchCostPerLead: paidSearchTotals.paidSearchCostPerLead,
    directOrganicInboundLeads: paidSearchTotals.directOrganicInboundLeads,
    arrCreated,
    byRegionGroup,
    inactiveRegionGroups,
    advancedStageDeals,
  };
}

function emptyChannelMetrics(): ChannelMetrics {
  return { spend: 0, clicks: 0, impressions: 0, paidConversions: 0, inboundLeads: 0 };
}

function buildPaidMediaByCountry(
  campaigns: Campaign[],
  leadsInRange: Lead[],
): { rows: CountryChannelRow[]; unclassified: string[] } {
  const rowsByKey = new Map<CountryKey, CountryChannelRow>();
  for (const key of COUNTRY_ORDER) {
    rowsByKey.set(key, {
      country: key,
      paidSearch: emptyChannelMetrics(),
      display: emptyChannelMetrics(),
    });
  }

  const unclassified = new Set<string>();
  for (const c of campaigns) {
    const country = classifyCampaignCountry(c.campaign);
    if (!country) {
      unclassified.add(c.campaign);
      continue;
    }
    const channel = classifyCampaignChannel(c.campaignType);
    const row = rowsByKey.get(country)!;
    const bucket = row[channel];
    bucket.spend += c.cost || 0;
    bucket.clicks += c.clicks || 0;
    bucket.impressions += c.impressions || 0;
    bucket.paidConversions += c.conversions || 0;
  }

  const seenLeadIds = new Set<string>();
  for (const l of leadsInRange) {
    if (seenLeadIds.has(l.id)) continue;
    seenLeadIds.add(l.id);
    const country = classifyLeadCountry(l.country);
    if (!country) continue;
    const channel = classifyLeadChannel(l.source);
    rowsByKey.get(country)![channel].inboundLeads += 1;
  }

  const rows = COUNTRY_ORDER.map((k) => rowsByKey.get(k)!);
  return { rows, unclassified: Array.from(unclassified) };
}

function inRange(d: Date | null, range: DateRange): boolean {
  if (!d) return false;
  const t = d.getTime();
  return t >= range.start.getTime() && t < range.end.getTime();
}

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

function breakdownBySource(leads: Lead[]): SourceBreakdown[] {
  const counts = new Map<string, number>();
  for (const l of leads) {
    if (!l.source) continue;
    counts.set(l.source, (counts.get(l.source) ?? 0) + 1);
  }
  const total = leads.length || 1;
  return Array.from(counts.entries())
    .map(([source, count]) => ({ source, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);
}

function breakdownByCountry(leads: Lead[]): CountryBreakdown[] {
  const counts = new Map<string, number>();
  for (const l of leads) {
    if (!l.country) continue;
    counts.set(l.country, (counts.get(l.country) ?? 0) + 1);
  }
  const total = leads.length || 1;
  return Array.from(counts.entries())
    .map(([country, count]) => ({ country, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);
}

const STAGE_AGGREGATIONS: { label: string; pairs: { name: string; pipeline: string }[] }[] = [
  {
    label: "New / Attempting",
    pairs: [
      { name: "new", pipeline: "cc - inbound & lead gen" },
      { name: "new / attempting", pipeline: "cc - new leads" },
    ],
  },
  {
    label: "Disqualified",
    pairs: [
      { name: "disqualified", pipeline: "cc - inbound & lead gen" },
      { name: "disqualified", pipeline: "cc - new leads" },
    ],
  },
  {
    label: "Not pursuing",
    pairs: [
      { name: "not pursuing", pipeline: "cc - inbound & lead gen" },
      { name: "not pursuing", pipeline: "cc - new leads" },
    ],
  },
  {
    label: "Qualified",
    pairs: [
      { name: "qualified", pipeline: "cc - inbound & lead gen" },
      { name: "qualified", pipeline: "cc - new leads" },
    ],
  },
  {
    label: "Engaged",
    pairs: [
      { name: "engaged", pipeline: "cc - inbound & lead gen" },
      { name: "engaged", pipeline: "cc - new leads" },
    ],
  },
];

function normaliseStagePart(s: string): string {
  return s
    .replace(/[‐-―−]/g, "-") // any unicode dash → ASCII hyphen
    .replace(/[   ]/g, " ") // non-breaking spaces → regular space
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseStageString(raw: string): { name: string; pipeline: string | null } {
  const m = raw.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (!m) return { name: normaliseStagePart(raw), pipeline: null };
  return { name: normaliseStagePart(m[1]), pipeline: normaliseStagePart(m[2]) };
}

function aggregatedStageLabel(rawStage: string): string | null {
  const parsed = parseStageString(rawStage);
  if (!parsed.pipeline) return null;
  for (const group of STAGE_AGGREGATIONS) {
    for (const pair of group.pairs) {
      if (parsed.name === pair.name && parsed.pipeline === pair.pipeline) {
        return group.label;
      }
    }
  }
  return null;
}

function breakdownByLeadStage(leads: Lead[]): StageBreakdown[] {
  const counts = new Map<string, number>();
  for (const l of leads) {
    if (!l.leadStage) continue;
    const aggregated = aggregatedStageLabel(l.leadStage);
    const key = aggregated ?? l.leadStage;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = leads.length || 1;
  return Array.from(counts.entries())
    .map(([stage, count]) => ({ stage, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);
}

function toHighValue(d: Deal): HighValueDeal {
  return {
    dealName: d.dealName ?? "(unnamed deal)",
    company: d.company ?? "—",
    amount: d.amount ?? d.annualizedAmount ?? 0,
    stage: d.dealStage ?? "—",
    createDate: d.createDate ? d.createDate.toISOString() : null,
  };
}

function mergeDealLists(lists: Deal[][]): Deal[] {
  const merged = new Map<string, Deal>();
  for (const list of lists) {
    for (const d of list) {
      const existing = merged.get(d.id);
      if (!existing) {
        merged.set(d.id, { ...d });
        continue;
      }
      merged.set(d.id, {
        id: existing.id,
        dealName: existing.dealName ?? d.dealName,
        company: existing.company ?? d.company,
        amount: existing.amount ?? d.amount,
        annualizedAmount: existing.annualizedAmount ?? d.annualizedAmount,
        dealStage: existing.dealStage ?? d.dealStage,
        createDate: existing.createDate ?? d.createDate,
        closeDate: existing.closeDate ?? d.closeDate,
        source: existing.source ?? d.source,
        country: existing.country ?? d.country,
      });
    }
  }
  return Array.from(merged.values());
}

function datasetsCoverRange(datasets: ParsedDatasets, range: DateRange): boolean {
  const start = range.start.getTime();
  const haveEarlierLead = datasets.leads.some(
    (l) => l.createDate && l.createDate.getTime() < start,
  );
  const haveEarlierDeal = datasets.paidPipeDeals.some(
    (d) => d.createDate && d.createDate.getTime() < start,
  );
  return haveEarlierLead || haveEarlierDeal;
}

function buildPaidSearchTotals(
  leadsInRange: Lead[],
  paidMediaByCountry: CountryChannelRow[],
): {
  paidSearchInboundLeads: number;
  paidSearchSpend: number;
  paidSearchCostPerLead: number | null;
  directOrganicInboundLeads: number;
} {
  let paidSearchInboundLeads = 0;
  let directOrganicInboundLeads = 0;
  const seen = new Set<string>();
  for (const l of leadsInRange) {
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    if (!l.source || l.source.trim() === "") continue;
    if (classifyLeadChannel(l.source) === "paidSearch") {
      paidSearchInboundLeads += 1;
    } else {
      directOrganicInboundLeads += 1;
    }
  }
  const paidSearchSpend = paidMediaByCountry.reduce((s, r) => s + r.paidSearch.spend, 0);
  const paidSearchCostPerLead =
    paidSearchInboundLeads > 0 ? paidSearchSpend / paidSearchInboundLeads : null;
  return {
    paidSearchInboundLeads,
    paidSearchSpend,
    paidSearchCostPerLead,
    directOrganicInboundLeads,
  };
}

function emptyRegionStages(): RegionStageCounts {
  return { newAttempting: 0, engaged: 0, qualified: 0, notPursuing: 0, disqualified: 0, other: 0 };
}

function stageBucketFromLabel(label: string | null): keyof RegionStageCounts {
  if (!label) return "other";
  switch (label) {
    case "New / Attempting":
      return "newAttempting";
    case "Engaged":
      return "engaged";
    case "Qualified":
      return "qualified";
    case "Not pursuing":
      return "notPursuing";
    case "Disqualified":
      return "disqualified";
    default:
      return "other";
  }
}

function buildRegionGroupBreakdown(leadsInRange: Lead[]): RegionGroupBreakdown[] {
  const byGroup = new Map<RegionGroup, {
    count: number;
    paidSearchLeads: number;
    directOrganicLeads: number;
    stages: RegionStageCounts;
    countries: Map<string, number>;
  }>();
  const seen = new Set<string>();
  let total = 0;
  for (const l of leadsInRange) {
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    const countryKey = classifyLeadCountry(l.country);
    const group: RegionGroup = countryKey != null ? REGION_GROUP_MAP[countryKey] : "Other";
    const entry = byGroup.get(group) ?? {
      count: 0,
      paidSearchLeads: 0,
      directOrganicLeads: 0,
      stages: emptyRegionStages(),
      countries: new Map<string, number>(),
    };
    entry.count += 1;
    total += 1;
    if (classifyLeadChannel(l.source) === "paidSearch") entry.paidSearchLeads += 1;
    else entry.directOrganicLeads += 1;
    const aggregated = l.leadStage ? aggregatedStageLabel(l.leadStage) : null;
    entry.stages[stageBucketFromLabel(aggregated)] += 1;
    const rawCountry = (l.country ?? "").trim();
    if (rawCountry) entry.countries.set(rawCountry, (entry.countries.get(rawCountry) ?? 0) + 1);
    byGroup.set(group, entry);
  }
  const safeTotal = total || 1;
  const rows: RegionGroupBreakdown[] = [];
  for (const [group, entry] of byGroup.entries()) {
    const stagePcts: RegionStageCounts = {
      newAttempting: pctOf(entry.stages.newAttempting, entry.count),
      engaged: pctOf(entry.stages.engaged, entry.count),
      qualified: pctOf(entry.stages.qualified, entry.count),
      notPursuing: pctOf(entry.stages.notPursuing, entry.count),
      disqualified: pctOf(entry.stages.disqualified, entry.count),
      other: pctOf(entry.stages.other, entry.count),
    };
    const countries = Array.from(entry.countries.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
    rows.push({
      group,
      count: entry.count,
      pct: (entry.count / safeTotal) * 100,
      paidSearchLeads: entry.paidSearchLeads,
      directOrganicLeads: entry.directOrganicLeads,
      priorCount: null,
      deltaPct: null,
      stages: entry.stages,
      stagePcts,
      qualifiedOutPct: stagePcts.disqualified,
      countries,
    });
  }
  return rows.sort((a, b) => b.count - a.count);
}

function pctOf(n: number, denom: number): number {
  if (denom <= 0) return 0;
  return (n / denom) * 100;
}

function buildArrCreated(datasets: ParsedDatasets, range: DateRange): number {
  let total = 0;
  for (const d of datasets.closedWonDeals) {
    if (!inRange(d.closeDate, range)) continue;
    if (typeof d.annualizedAmount === "number") total += d.annualizedAmount;
  }
  return total;
}

function buildAdvancedStageDeals(datasets: ParsedDatasets, range: DateRange): AdvancedStageDeal[] {
  const merged = mergeDealLists([
    datasets.closedWonDeals,
    datasets.regionalDeals,
    datasets.paidPipeDeals,
  ]);
  const matches = merged.filter((d) => {
    const refDate = d.closeDate ?? d.createDate;
    if (!inRange(refDate, range)) return false;
    return (
      matchStage(d.dealStage, "contract_live") ||
      matchStage(d.dealStage, "onboarding") ||
      matchStage(d.dealStage, "achieving_impact")
    );
  });
  return matches
    .map((d) => ({
      dealName: d.dealName ?? "(unnamed deal)",
      company: d.company ?? "—",
      country: d.country ?? null,
      stage: d.dealStage ?? "—",
      amount: d.amount ?? d.annualizedAmount ?? 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}
