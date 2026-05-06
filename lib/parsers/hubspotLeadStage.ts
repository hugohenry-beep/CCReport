import type { Deal } from "../types";
import { detailSheetName, getDate, getString, readWorkbook, rowsFromSheet } from "./sheetUtils";

export function parseHubspotLeadStage(buf: Buffer): Deal[] {
  const wb = readWorkbook(buf);
  const sheet = detailSheetName(wb);
  const rows = rowsFromSheet(wb, sheet);
  const deals: Deal[] = [];
  for (const row of rows) {
    const id = getString(row, "Deal ID", "Lead ID", "Contact ID");
    if (!id) continue;
    deals.push({
      id,
      dealName: getString(row, "Deal Name"),
      company: null,
      amount: null,
      annualizedAmount: null,
      dealStage: getString(row, "Deal Stage", "Lead stage"),
      createDate: getDate(row, "Create Date", "Object create date/time"),
      closeDate: getDate(row, "Close Date"),
      source: getString(row, "Original Traffic Source"),
      country: getString(row, "Country"),
    });
  }
  return deals;
}
