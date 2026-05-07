import type { Campaign, Deal, FileKind, FileMeta, Lead, ParsedDatasets } from "../types";
import { parseGoogleAdsCampaigns } from "./googleAdsCampaigns";
import { parseHubspotClosedWon } from "./hubspotClosedWon";
import { parseHubspotLeadQO } from "./hubspotLeadQO";
import { parseHubspotLeadStage } from "./hubspotLeadStage";
import { parseHubspotLeadVolume } from "./hubspotLeadVolume";
import { parseHubspotPaidPipe } from "./hubspotPaidPipe";
import { parseHubspotRegional } from "./hubspotRegional";
import { parseHubspotTotalVolume } from "./hubspotTotalVolume";
import type { NamedFile } from "./unzip";
import { isXlsx, isZip, unzipBuffer } from "./unzip";

export function classify(filename: string): FileKind {
  const n = filename.toLowerCase();
  if (n.includes("campaign report") || (n.includes("campaign") && n.includes(".xlsx") && !n.includes("hubspot"))) {
    return "googleAdsCampaigns";
  }
  if (!n.startsWith("hubspot")) {
    if (n.includes("campaign")) return "googleAdsCampaigns";
  }
  if (n.includes("paid-pipe-created")) return "hubspotPaidPipe";
  if (n.includes("cc-inbound-last-week-stage")) return "hubspotLeadStage";
  if (n.includes("cc-inbound-last-week-qo")) return "hubspotLeadQO";
  if (n.includes("cc-inbound-lead-volume")) return "hubspotLeadVolume";
  if (n.includes("cc-inbound-total-lead-volum")) return "hubspotTotalVolume";
  if (n.includes("total-closed-won")) return "hubspotClosedWon";
  if (n.includes("usa-canada") || n.includes("europe-and-row")) return "hubspotRegional";
  return "unrecognized";
}

export function expandUploads(files: NamedFile[]): NamedFile[] {
  const out: NamedFile[] = [];
  for (const f of files) {
    if (isZip(f.name)) {
      try {
        out.push(...unzipBuffer(f.buffer));
      } catch (err) {
        console.warn(`Failed to unzip ${f.name}:`, err);
      }
      continue;
    }
    if (isXlsx(f.name)) {
      out.push(f);
    }
  }
  return out;
}

export function parseAll(uploads: NamedFile[]): ParsedDatasets {
  const flat = expandUploads(uploads);

  const leads: Lead[] = [];
  const leadStageDeals: Deal[] = [];
  const paidPipeDeals: Deal[] = [];
  const closedWonDeals: Deal[] = [];
  const regionalDeals: Deal[] = [];
  const campaigns: Campaign[] = [];
  const files: FileMeta[] = [];
  const warnings: string[] = [];
  let adsPeriodLabel: string | null = null;

  // Track which lead-source files we've consumed to dedupe.
  const seenLeadVolumeFiles: string[] = [];

  for (const f of flat) {
    const kind = classify(f.name);
    try {
      switch (kind) {
        case "googleAdsCampaigns": {
          const { campaigns: c, periodLabel } = parseGoogleAdsCampaigns(f.buffer);
          campaigns.push(...c);
          if (periodLabel && !adsPeriodLabel) adsPeriodLabel = periodLabel;
          files.push({ name: f.name, kind, rowCount: c.length });
          break;
        }
        case "hubspotPaidPipe": {
          const d = parseHubspotPaidPipe(f.buffer);
          paidPipeDeals.push(...d);
          files.push({ name: f.name, kind, rowCount: d.length });
          break;
        }
        case "hubspotLeadStage": {
          const d = parseHubspotLeadStage(f.buffer);
          leadStageDeals.push(...d);
          files.push({ name: f.name, kind, rowCount: d.length });
          break;
        }
        case "hubspotLeadQO": {
          const l = parseHubspotLeadQO(f.buffer);
          leads.push(...l);
          seenLeadVolumeFiles.push(f.name);
          files.push({ name: f.name, kind, rowCount: l.length, note: "lead stages (QO)" });
          break;
        }
        case "hubspotLeadVolume": {
          const l = parseHubspotLeadVolume(f.buffer);
          leads.push(...l);
          seenLeadVolumeFiles.push(f.name);
          files.push({ name: f.name, kind, rowCount: l.length, note: "multi-week lead volume" });
          break;
        }
        case "hubspotTotalVolume": {
          const l = parseHubspotTotalVolume(f.buffer);
          leads.push(...l);
          seenLeadVolumeFiles.push(f.name);
          const hasSource = l.some((x) => x.source);
          files.push({
            name: f.name,
            kind,
            rowCount: l.length,
            note: hasSource ? "with source attribution" : "no source column",
          });
          break;
        }
        case "hubspotClosedWon": {
          const d = parseHubspotClosedWon(f.buffer);
          closedWonDeals.push(...d);
          files.push({ name: f.name, kind, rowCount: d.length });
          break;
        }
        case "hubspotRegional": {
          const d = parseHubspotRegional(f.buffer);
          regionalDeals.push(...d);
          files.push({ name: f.name, kind, rowCount: d.length });
          break;
        }
        default:
          warnings.push(`Skipped unrecognized file: ${f.name}`);
          files.push({ name: f.name, kind: "unrecognized", rowCount: 0 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`Failed to parse ${f.name}: ${msg}`);
      files.push({ name: f.name, kind: "unrecognized", rowCount: 0, note: msg });
    }
  }

  const dedupedLeads = dedupeLeadsByIdAndDate(leads);
  const dedupedClosedWon = dedupeDealsById(closedWonDeals);
  const dedupedPaidPipe = dedupeDealsById(paidPipeDeals);
  const dedupedLeadStage = dedupeDealsById(leadStageDeals);
  const dedupedRegional = dedupeDealsById(regionalDeals);
  const dedupedCampaigns = dedupeCampaignsByName(campaigns);

  return {
    leads: dedupedLeads,
    leadStageDeals: dedupedLeadStage,
    paidPipeDeals: dedupedPaidPipe,
    closedWonDeals: dedupedClosedWon,
    regionalDeals: dedupedRegional,
    campaigns: dedupedCampaigns,
    adsPeriodLabel,
    files,
    warnings,
  };
}

function dedupeCampaignsByName(campaigns: Campaign[]): Campaign[] {
  const seen = new Map<string, Campaign>();
  for (const c of campaigns) {
    if (!seen.has(c.campaign)) seen.set(c.campaign, c);
  }
  return Array.from(seen.values());
}

function dedupeLeadsByIdAndDate(leads: Lead[]): Lead[] {
  const merged = new Map<string, Lead>();
  for (const l of leads) {
    const key = l.id;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...l });
      continue;
    }
    merged.set(key, {
      id: existing.id,
      createDate: existing.createDate ?? l.createDate,
      leadStage: existing.leadStage ?? l.leadStage,
      source: existing.source ?? l.source,
      country: existing.country ?? l.country,
    });
  }
  return Array.from(merged.values());
}

function dedupeDealsById(deals: Deal[]): Deal[] {
  const merged = new Map<string, Deal>();
  for (const d of deals) {
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
  return Array.from(merged.values());
}
