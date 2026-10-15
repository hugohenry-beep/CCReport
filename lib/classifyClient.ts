import type { FileKind } from "./types";

/**
 * Filename → kind mapping for HubSpot / Google Ads exports. Client-safe (no
 * xlsx or zip deps) so the upload form and lib/parsers/index.ts:classify()
 * share one implementation.
 */
export function classifyFilename(filename: string): FileKind {
  const n = filename.toLowerCase();
  if (n.includes("campaign report") || (n.includes("campaign") && n.includes(".xlsx") && !n.includes("hubspot"))) {
    return "googleAdsCampaigns";
  }
  if (!n.startsWith("hubspot") && n.includes("campaign")) return "googleAdsCampaigns";
  // Was "paid-pipe-created-last-week-a…" until the Oct 2026 dashboard rework,
  // now "pipe-created-last-week-all-co…" (all new-business deals, ~10 weeks).
  if (n.includes("pipe-created")) return "hubspotPaidPipe";
  if (n.includes("cc-inbound-last-week-stage")) return "hubspotLeadStage";
  if (n.includes("cc-inbound-last-week-qo")) return "hubspotLeadQO";
  // Must precede the "cc-inbound-lead-volume" check, which it also contains.
  if (n.includes("cc-inbound-lead-volume-vs-p")) return "hubspotLeadPipeline";
  if (n.includes("cc-inbound-lead-volume")) return "hubspotLeadVolume";
  if (n.includes("cc-inbound-total-lead-volum")) return "hubspotTotalVolume";
  // Per-lead country exports with the same columns as total-lead-volum: the
  // "TOP 2" chart is a copy of it, the "weekly lead volume" ones are country
  // subsets. Lead-ID dedupe merges them.
  if (n.includes("cc-inbound-top-2-weekly-lea") || n.includes("cc-inbound-weekly-lead-volu")) {
    return "hubspotTotalVolume";
  }
  if (n.includes("total-closed-won")) return "hubspotClosedWon";
  if (n.includes("usa-canada") || n.includes("europe-and-row")) return "hubspotRegional";
  return "unrecognized";
}

export function classifyClient(filename: string): FileKind | "zip" {
  if (filename.toLowerCase().endsWith(".zip")) return "zip";
  return classifyFilename(filename);
}

export const FILE_KIND_LABEL: Record<FileKind | "zip", string> = {
  googleAdsCampaigns: "Google Ads — Campaigns",
  hubspotPaidPipe: "HubSpot — Pipe created (deals)",
  hubspotLeadStage: "HubSpot — Lead stage breakdown",
  hubspotLeadQO: "HubSpot — Lead QO funnel",
  hubspotLeadVolume: "HubSpot — Lead volume",
  hubspotTotalVolume: "HubSpot — Total lead volume",
  hubspotLeadPipeline: "HubSpot — Lead volume vs pipeline (not used)",
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
