import type { Deal } from "../types";
import { detailSheetName, getDate, getNumber, getString, readWorkbook, rowsFromSheet } from "./sheetUtils";

export function parseHubspotClosedWon(buf: Buffer): Deal[] {
  const wb = readWorkbook(buf);
  const sheet = detailSheetName(wb);
  const rows = rowsFromSheet(wb, sheet);
  const deals: Deal[] = [];
  for (const row of rows) {
    const id = getString(row, "Deal ID", "Record ID");
    if (!id) continue;
    deals.push({
      id,
      dealName: getString(row, "Deal Name"),
      company: getString(row, "Company name"),
      amount: getNumber(row, "Amount in company currency", "Amount"),
      annualizedAmount: getNumber(row, "Annualized amount in company currency", "Annualized amount", "Annual contract value"),
      dealStage: getString(row, "Deal Stage"),
      createDate: getDate(row, "Object create date/time", "Create Date"),
      closeDate: getDate(row, "Close Date"),
      source: getString(row, "Original Traffic Source"),
      country: getString(row, "Country"),
    });
  }
  return deals;
}
