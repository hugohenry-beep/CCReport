import * as XLSX from "xlsx";
import type { Campaign } from "../types";
import { getNumber, getString, readWorkbook, rowsFromSheetWithRange } from "./sheetUtils";

export interface GoogleAdsResult {
  campaigns: Campaign[];
  periodLabel: string | null;
}

export function parseGoogleAdsCampaigns(buf: Buffer): GoogleAdsResult {
  const wb = readWorkbook(buf);
  const sheetName = wb.SheetNames[0];
  const periodLabel = readPeriodLabel(wb, sheetName);
  const headerRowIndex = locateHeaderRow(wb, sheetName);
  const rows = rowsFromSheetWithRange(wb, sheetName, headerRowIndex);

  const campaigns: Campaign[] = [];
  for (const row of rows) {
    const status = getString(row, "Campaign status");
    if (status && /^total\b/i.test(status)) continue;
    const campaign = getString(row, "Campaign");
    if (!campaign) continue;
    if (/^total\b/i.test(campaign)) continue;
    if (/^-+$/.test(campaign)) continue;
    campaigns.push({
      campaign,
      campaignType: getString(row, "Campaign type", "Campaign Type") ?? "",
      cost: getNumber(row, "Cost", "Avg. cost") ?? 0,
      conversions: getNumber(row, "Conversions", "Conv. (Platform Comparable)") ?? 0,
      conversionValue: getNumber(row, "Conv. value", "Original conv. value") ?? 0,
      clicks: getNumber(row, "Clicks") ?? 0,
      impressions: getNumber(row, "Impr.", "Impressions") ?? 0,
    });
  }

  return { campaigns, periodLabel };
}

function readPeriodLabel(wb: XLSX.WorkBook, sheetName: string): string | null {
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: false });
  for (const row of aoa.slice(0, 5)) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      if (typeof cell !== "string") continue;
      if (/\d{4}/.test(cell) && /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2})/i.test(cell)) {
        return cell.trim();
      }
    }
  }
  return null;
}

function locateHeaderRow(wb: XLSX.WorkBook, sheetName: string): number {
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: false });
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const r = aoa[i];
    if (Array.isArray(r) && r.some((c) => typeof c === "string" && c.trim().toLowerCase() === "campaign")) {
      return i;
    }
  }
  return 2;
}
