import type { Deal } from "../types";
import { detailSheetName, getDate, getNumber, getString, readWorkbook, rowsFromSheet } from "./sheetUtils";

export function parseHubspotPaidPipe(buf: Buffer): Deal[] {
  const wb = readWorkbook(buf);
  const sheet = detailSheetName(wb);
  const rows = rowsFromSheet(wb, sheet);
  const deals: Deal[] = [];
  for (const row of rows) {
    const id = getString(row, "Record ID", "Deal ID");
    if (!id) continue;
    deals.push({
      id,
      dealName: getString(row, "Deal Name"),
      company: getString(row, "Company name", "Company Name"),
      amount: getNumber(row, "Amount in company currency", "Amount", "Annualized amount"),
      annualizedAmount: getNumber(row, "Annualized amount", "Annual contract value"),
      dealStage: getString(row, "Deal Stage", "Lead stage"),
      createDate: getDate(row, "Create Date", "Object create date/time", "Create date"),
      closeDate: getDate(row, "Close Date"),
      source: getString(row, "Original Traffic Source", "Original Source", "Lead Source"),
      country: getString(row, "Country"),
    });
  }
  return deals;
}
