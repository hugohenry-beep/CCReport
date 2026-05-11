import type { Worksheet } from "exceljs";
import { SUMMARY, TOTAL_ROW } from "./cellMap";
import { divideFormula } from "./formulas";
import { STYLES } from "./styles";
import { NUMBER_FORMATS } from "./template";

export function buildSummaryBlock(ws: Worksheet): void {
  ws.getCell("A1").value = "Weekly Paid Media KPI Summary";
  ws.getCell("A1").style = { font: { bold: true, size: 14 } };

  ws.getCell("A3").value = "Summary";
  ws.getCell("A3").style = STYLES.sectionTitle;

  ws.getCell("A4").value = "Spend";
  ws.getCell("A4").style = STYLES.summaryLabel;
  ws.getCell("B4").value = "Paid Search";
  ws.getCell("B4").style = STYLES.summaryLabel;
  ws.getCell("C4").value = { formula: `SUMIF(A16:A${TOTAL_ROW - 1},"Paid Search",B16:B${TOTAL_ROW - 1})`, result: undefined };
  ws.getCell("C4").numFmt = NUMBER_FORMATS.currencyEur;
  ws.getCell("C4").style = { ...STYLES.summaryValue, numFmt: NUMBER_FORMATS.currencyEur };
  ws.getCell("D4").value = { formula: `B${TOTAL_ROW}`, result: undefined };
  ws.getCell("D4").numFmt = NUMBER_FORMATS.currencyEur;
  ws.getCell("E4").value = "Total Inbound Leads";
  ws.getCell("E4").style = STYLES.summaryLabel;
  ws.getCell("G4").value = { formula: `P${TOTAL_ROW}`, result: undefined };
  ws.getCell("G4").numFmt = NUMBER_FORMATS.integer;
  ws.getCell("H4").value = { formula: `IFERROR(D4/G4,"")`, result: undefined };
  ws.getCell("H4").numFmt = NUMBER_FORMATS.currencyEur;

  ws.getCell("B5").value = "Display";
  ws.getCell("B5").style = STYLES.summaryLabel;
  ws.getCell("C5").value = { formula: `SUMIF(A16:A${TOTAL_ROW - 1},"Display",B16:B${TOTAL_ROW - 1})`, result: undefined };
  ws.getCell("C5").numFmt = NUMBER_FORMATS.currencyEur;
  ws.getCell("E5").value = "Paid Search";
  ws.getCell("E5").style = STYLES.summaryLabel;
  ws.getCell("F5").value = "Paid Search";
  ws.getCell("F5").style = STYLES.summaryLabel;
  ws.getCell("G5").value = { formula: `SUMIF(A16:A${TOTAL_ROW - 1},"Paid Search",P16:P${TOTAL_ROW - 1})`, result: undefined };
  ws.getCell("G5").numFmt = NUMBER_FORMATS.integer;
  ws.getCell("H5").value = { formula: divideFormula("C4", "G5").slice(1), result: undefined };
  ws.getCell("H5").numFmt = NUMBER_FORMATS.currencyEur;

  ws.getCell("A6").value = "Clicks";
  ws.getCell("A6").style = STYLES.summaryLabel;
  ws.getCell("B6").value = "Paid Search";
  ws.getCell("B6").style = STYLES.summaryLabel;
  ws.getCell("C6").value = { formula: `SUMIF(A16:A${TOTAL_ROW - 1},"Paid Search",E16:E${TOTAL_ROW - 1})`, result: undefined };
  ws.getCell("C6").numFmt = NUMBER_FORMATS.integer;
  ws.getCell("D6").value = { formula: `E${TOTAL_ROW}`, result: undefined };
  ws.getCell("D6").numFmt = NUMBER_FORMATS.integer;
  ws.getCell("F6").value = "Direct & Organic";
  ws.getCell("F6").style = STYLES.summaryLabel;
  ws.getCell("G6").value = { formula: "G4-G5", result: undefined };
  ws.getCell("G6").numFmt = NUMBER_FORMATS.integer;

  ws.getCell("B7").value = "Display";
  ws.getCell("B7").style = STYLES.summaryLabel;
  ws.getCell("C7").value = { formula: `SUMIF(A16:A${TOTAL_ROW - 1},"Display",E16:E${TOTAL_ROW - 1})`, result: undefined };
  ws.getCell("C7").numFmt = NUMBER_FORMATS.integer;

  ws.getCell("A8").value = "Impressions";
  ws.getCell("A8").style = STYLES.summaryLabel;
  ws.getCell("B8").value = "Paid Search";
  ws.getCell("B8").style = STYLES.summaryLabel;
  ws.getCell("C8").value = { formula: `SUMIF(A16:A${TOTAL_ROW - 1},"Paid Search",I16:I${TOTAL_ROW - 1})`, result: undefined };
  ws.getCell("C8").numFmt = NUMBER_FORMATS.integer;
  ws.getCell("D8").value = { formula: `I${TOTAL_ROW}`, result: undefined };
  ws.getCell("D8").numFmt = NUMBER_FORMATS.integer;

  ws.getCell("B9").value = "Display";
  ws.getCell("B9").style = STYLES.summaryLabel;
  ws.getCell("C9").value = { formula: `SUMIF(A16:A${TOTAL_ROW - 1},"Display",I16:I${TOTAL_ROW - 1})`, result: undefined };
  ws.getCell("C9").numFmt = NUMBER_FORMATS.integer;

  // Style the value cells in the summary block
  for (const addr of [SUMMARY.spendPaidSearchTotal, SUMMARY.spendDisplayTotal, SUMMARY.spendGrandTotal, SUMMARY.costPerInboundLead, SUMMARY.costPerPaidSearchLead]) {
    ws.getCell(addr).numFmt = NUMBER_FORMATS.currencyEur;
    ws.getCell(addr).font = { bold: true };
  }
  for (const addr of [
    SUMMARY.clicksPaidSearchTotal,
    SUMMARY.clicksDisplayTotal,
    SUMMARY.clicksGrandTotal,
    SUMMARY.impressionsPaidSearchTotal,
    SUMMARY.impressionsDisplayTotal,
    SUMMARY.impressionsGrandTotal,
    SUMMARY.totalInboundLeads,
    SUMMARY.paidSearchInboundLeads,
    SUMMARY.directOrganicLeads,
  ]) {
    ws.getCell(addr).numFmt = NUMBER_FORMATS.integer;
    ws.getCell(addr).font = { bold: true };
  }
}
