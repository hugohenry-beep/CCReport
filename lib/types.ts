export const HIGH_VALUE_THRESHOLD = 15000;

export const STAGE_KEYWORDS = {
  demo: ["demo"],
  negotiating: ["negotiation", "negotiating"],
  contract_live: ["contract is live", "contract live", "live contract"],
  onboarding: ["onboarding"],
  achieving_impact: ["achieving impact"],
} as const;

export type StageTarget = keyof typeof STAGE_KEYWORDS;

export type FileKind =
  | "googleAdsCampaigns"
  | "hubspotPaidPipe"
  | "hubspotLeadStage"
  | "hubspotLeadQO"
  | "hubspotLeadVolume"
  | "hubspotTotalVolume"
  | "hubspotClosedWon"
  | "hubspotRegional"
  | "unrecognized";

export interface FileMeta {
  name: string;
  kind: FileKind;
  rowCount: number;
  note?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface Lead {
  id: string;
  createDate: Date | null;
  leadStage: string | null;
  source: string | null;
  country: string | null;
}

export interface Deal {
  id: string;
  dealName: string | null;
  company: string | null;
  amount: number | null;
  annualizedAmount: number | null;
  dealStage: string | null;
  createDate: Date | null;
  closeDate: Date | null;
  source: string | null;
  country: string | null;
}

export interface Campaign {
  campaign: string;
  campaignType: string;
  cost: number;
  conversions: number;
  conversionValue: number;
  clicks: number;
  impressions: number;
}

export interface ParsedDatasets {
  leads: Lead[];
  leadStageDeals: Deal[];
  paidPipeDeals: Deal[];
  closedWonDeals: Deal[];
  regionalDeals: Deal[];
  campaigns: Campaign[];
  adsPeriodLabel: string | null;
  files: FileMeta[];
  warnings: string[];
}

export interface SourceBreakdown {
  source: string;
  count: number;
  pct: number;
}

export interface StageBreakdown {
  stage: string;
  count: number;
  pct: number;
}

export interface CountryBreakdown {
  country: string;
  count: number;
  pct: number;
}

export interface HighValueDeal {
  dealName: string;
  company: string;
  amount: number;
  stage: string;
  createDate: string | null;
}

export type ChannelKey = "paidSearch" | "display";

export const COUNTRY_KEYS = [
  "USA",
  "UK",
  "Canada",
  "France",
  "DACH",
  "Spain",
  "Nordics",
  "Netherlands",
  "Italy",
  "LATAM",
  "Australia",
] as const;
export type CountryKey = (typeof COUNTRY_KEYS)[number];

export interface ChannelMetrics {
  spend: number;
  clicks: number;
  impressions: number;
  paidConversions: number;
  inboundLeads: number;
}

export interface CountryChannelRow {
  country: CountryKey;
  paidSearch: ChannelMetrics;
  display: ChannelMetrics;
}

export type RegionGroup = "USA & Canada" | "Europe & ROW" | "LATAM" | "Australia" | "Other";

export interface RegionStageCounts {
  newAttempting: number;
  engaged: number;
  qualified: number;
  notPursuing: number;
  disqualified: number;
  other: number;
}

export interface RegionGroupBreakdown {
  group: RegionGroup;
  count: number;
  pct: number;
  paidSearchLeads: number;
  directOrganicLeads: number;
  priorCount: number | null;
  deltaPct: number | null;
  stages: RegionStageCounts;
  stagePcts: RegionStageCounts;
  qualifiedOutPct: number;
  countries: { country: string; count: number }[];
}

export interface AdvancedStageDeal {
  dealName: string;
  company: string;
  country: string | null;
  stage: string;
  amount: number;
}

export interface PeriodMetrics {
  inboundLeadCount: number;
  bySource: SourceBreakdown[];
  byStage: StageBreakdown[];
  byCountry: CountryBreakdown[];
  adSpend: number;
  totalDealValue: number;
  costPerLead: number | null;
  costPerDealDollar: number | null;
  highValueDeals: HighValueDeal[];
  demoCount: number;
  negotiatingCount: number;
  enteredContractLiveCount: number;
  enteredContractLiveDeals: HighValueDeal[];
  paidMediaByCountry?: CountryChannelRow[];
  unclassifiedCampaigns?: string[];

  // Narrative-recap extensions
  paidSearchInboundLeads: number;
  paidSearchSpend: number;
  paidSearchCostPerLead: number | null;
  directOrganicInboundLeads: number;
  arrCreated: number;
  byRegionGroup: RegionGroupBreakdown[];
  inactiveRegionGroups: RegionGroup[];
  advancedStageDeals: AdvancedStageDeal[];
}

export interface ComparisonInfo {
  source: "current_upload" | "stored_snapshot" | "none";
  snapshotId?: string;
  snapshotPeriodStart?: string;
  snapshotPeriodEnd?: string;
}

export interface Metrics {
  current: PeriodMetrics;
  prior: PeriodMetrics | null;
  comparisonInfo: ComparisonInfo;
  periodStart: string;
  periodEnd: string;
  priorPeriodStart: string;
  priorPeriodEnd: string;
  adsPeriodLabel: string | null;
  warnings: string[];
}
