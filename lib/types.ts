export const HIGH_VALUE_THRESHOLD = 15000;

export const STAGE_KEYWORDS = {
  demo: ["demo"],
  negotiating: ["negotiation", "negotiating"],
  contract_live: ["contract is live", "contract live", "live contract"],
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

export interface HighValueDeal {
  dealName: string;
  company: string;
  amount: number;
  stage: string;
  createDate: string | null;
}

export interface PeriodMetrics {
  inboundLeadCount: number;
  bySource: SourceBreakdown[];
  byStage: StageBreakdown[];
  adSpend: number;
  totalDealValue: number;
  costPerLead: number | null;
  costPerDealDollar: number | null;
  highValueDeals: HighValueDeal[];
  demoCount: number;
  negotiatingCount: number;
  enteredContractLiveCount: number;
  enteredContractLiveDeals: HighValueDeal[];
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
