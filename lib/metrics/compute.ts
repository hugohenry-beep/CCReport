import type {
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

const STAGE_AGGREGATIONS: { label: string; matches: string[] }[] = [
  {
    label: "New / Attempting",
    matches: ["New (CC - Inbound & lead gen)", "New / Attempting (CC - New leads)"],
  },
  {
    label: "Disqualified",
    matches: ["Disqualified (CC - Inbound & lead gen)", "Disqualified (CC - New leads)"],
  },
  {
    label: "Not pursuing",
    matches: ["Not pursuing (CC - Inbound & lead gen)", "Not pursuing (CC - New leads)"],
  },
  {
    label: "Qualified",
    matches: ["Qualified (CC - Inbound & lead gen)", "Qualified (CC - New leads)"],
  },
];

function normaliseStage(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

const STAGE_AGGREGATION_LOOKUP = new Map<string, string>(
  STAGE_AGGREGATIONS.flatMap((g) => g.matches.map((m) => [normaliseStage(m), g.label] as const)),
);

function breakdownByLeadStage(leads: Lead[]): StageBreakdown[] {
  const counts = new Map<string, number>();
  for (const l of leads) {
    if (!l.leadStage) continue;
    const aggregated = STAGE_AGGREGATION_LOOKUP.get(normaliseStage(l.leadStage));
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
