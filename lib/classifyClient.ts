import type { FileKind } from "./types";

/**
 * Client-safe mirror of lib/parsers/index.ts:classify().
 * Kept in sync manually — both functions must agree on filename → kind mapping.
 */
export function classifyClient(filename: string): FileKind | "zip" {
  const n = filename.toLowerCase();
  if (n.endsWith(".zip")) return "zip";
  if (n.includes("campaign report") || (n.includes("campaign") && n.includes(".xlsx") && !n.includes("hubspot"))) {
    return "googleAdsCampaigns";
  }
  if (!n.startsWith("hubspot") && n.includes("campaign")) return "googleAdsCampaigns";
  if (n.includes("paid-pipe-created")) return "hubspotPaidPipe";
  if (n.includes("cc-inbound-last-week-stage")) return "hubspotLeadStage";
  if (n.includes("cc-inbound-last-week-qo")) return "hubspotLeadQO";
  if (n.includes("cc-inbound-lead-volume")) return "hubspotLeadVolume";
  if (n.includes("cc-inbound-total-lead-volum")) return "hubspotTotalVolume";
  if (n.includes("total-closed-won")) return "hubspotClosedWon";
  if (n.includes("usa-canada") || n.includes("europe-and-row")) return "hubspotRegional";
  return "unrecognized";
}

export const FILE_KIND_LABEL: Record<FileKind | "zip", string> = {
  googleAdsCampaigns: "Google Ads — Campaigns",
  hubspotPaidPipe: "HubSpot — Paid pipe (deals)",
  hubspotLeadStage: "HubSpot — Lead stage breakdown",
  hubspotLeadQO: "HubSpot — Lead QO funnel",
  hubspotLeadVolume: "HubSpot — Lead volume",
  hubspotTotalVolume: "HubSpot — Total lead volume",
  hubspotClosedWon: "HubSpot — Closed-won",
  hubspotRegional: "HubSpot — Regional cut",
  unrecognized: "Unrecognized",
  zip: "Zip archive",
};

export function fileKindVariant(kind: FileKind | "zip"): "default" | "accent" | "warning" {
  if (kind === "unrecognized") return "warning";
  if (kind === "zip") return "accent";
  return "default";
}
