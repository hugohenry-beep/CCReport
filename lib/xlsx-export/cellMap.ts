import { COUNTRY_ORDER } from "../metrics/paidMediaClassification";
import type { ChannelKey, CountryKey } from "../types";

export const TABLE_HEADER_ROW = 15;
export const FIRST_COUNTRY_ROW = 16;
export const ROWS_PER_COUNTRY = 3;
export const TOTAL_ROW = FIRST_COUNTRY_ROW + COUNTRY_ORDER.length * ROWS_PER_COUNTRY;

export const COUNTRY_ROW_INDEX: Record<CountryKey, number> = COUNTRY_ORDER.reduce(
  (acc, key, i) => {
    acc[key] = FIRST_COUNTRY_ROW + i * ROWS_PER_COUNTRY;
    return acc;
  },
  {} as Record<CountryKey, number>,
);

export function countryTotalRow(country: CountryKey): number {
  return COUNTRY_ROW_INDEX[country];
}

export function channelRow(country: CountryKey, channel: ChannelKey): number {
  const base = COUNTRY_ROW_INDEX[country];
  return channel === "paidSearch" ? base + 1 : base + 2;
}

export const TOTAL_ROW_LIST: number[] = COUNTRY_ORDER.map((c) => countryTotalRow(c));
export const PAID_SEARCH_ROW_LIST: number[] = COUNTRY_ORDER.map((c) => channelRow(c, "paidSearch"));
export const DISPLAY_ROW_LIST: number[] = COUNTRY_ORDER.map((c) => channelRow(c, "display"));

export const SUMMARY = {
  spendPaidSearchTotal: "C4",
  spendDisplayTotal: "C5",
  spendGrandTotal: "D4",
  clicksPaidSearchTotal: "C6",
  clicksDisplayTotal: "C7",
  clicksGrandTotal: "D6",
  impressionsPaidSearchTotal: "C8",
  impressionsDisplayTotal: "C9",
  impressionsGrandTotal: "D8",
  totalInboundLeads: "G4",
  costPerInboundLead: "H4",
  paidSearchInboundLeads: "G5",
  costPerPaidSearchLead: "H5",
  directOrganicLeads: "G6",
} as const;
