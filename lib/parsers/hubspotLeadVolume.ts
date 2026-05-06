import type { Lead } from "../types";
import { detailSheetName, getDate, getString, readWorkbook, rowsFromSheet } from "./sheetUtils";

export function parseHubspotLeadVolume(buf: Buffer): Lead[] {
  const wb = readWorkbook(buf);
  const sheet = detailSheetName(wb);
  const rows = rowsFromSheet(wb, sheet);
  const leads: Lead[] = [];
  for (const row of rows) {
    const id = getString(row, "Lead ID", "Contact ID", "Record ID");
    if (!id) continue;
    leads.push({
      id,
      createDate: getDate(row, "Object create date/time", "Create Date"),
      leadStage: getString(row, "Lead stage", "Deal Stage"),
      source: getString(row, "Original Traffic Source"),
      country: getString(row, "Country"),
    });
  }
  return leads;
}
