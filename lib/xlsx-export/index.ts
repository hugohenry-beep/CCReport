import ExcelJS from "exceljs";
import type { Metrics } from "../types";
import { buildCountryTable } from "./countryTable";
import { applyDeltaConditionalFormatting } from "./conditionalFormatting";
import { buildSummaryBlock } from "./summaryBlock";
import { COLUMN_WIDTHS, MERGED_RANGES } from "./template";
import { TABLE_HEADER_ROW } from "./cellMap";

function applyColumnWidths(ws: ExcelJS.Worksheet): void {
  for (const { col, width } of COLUMN_WIDTHS) {
    const c = ws.getColumn(col);
    c.width = width;
  }
}

function applyMerges(ws: ExcelJS.Worksheet): void {
  for (const range of MERGED_RANGES) {
    ws.mergeCells(range);
  }
}

function formatSheetName(metrics: Metrics): string {
  const start = new Date(metrics.periodStart);
  const end = new Date(metrics.periodEnd);
  const fmt = (d: Date) => `${d.getUTCDate()}-${d.getUTCMonth() + 1}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

function addWarningBanner(ws: ExcelJS.Worksheet, text: string): void {
  ws.getCell("A2").value = text;
  ws.getCell("A2").style = {
    font: { bold: true, color: { argb: "FF7F6000" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } },
    alignment: { horizontal: "left", vertical: "middle", wrapText: true },
  };
  ws.mergeCells("A2:R2");
  ws.getRow(2).height = 28;
}

export async function renderReportXlsx(metrics: Metrics, name: string | null): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Inbound Lead Report";
  wb.created = new Date();

  const sheetName = formatSheetName(metrics).slice(0, 31);
  const ws = wb.addWorksheet(sheetName, {
    views: [{ showGridLines: false }],
  });

  applyColumnWidths(ws);

  const currentRows = metrics.current?.paidMediaByCountry;
  const priorRows = metrics.prior?.paidMediaByCountry ?? undefined;

  const hasBreakdown = Array.isArray(currentRows) && currentRows.length > 0;
  if (!hasBreakdown) {
    addWarningBanner(
      ws,
      "This snapshot predates the country×channel breakdown feature. Value cells are blank; re-upload the source files to populate them.",
    );
  }

  buildSummaryBlock(ws);
  buildCountryTable(ws, hasBreakdown ? currentRows : undefined, priorRows);
  applyMerges(ws);
  applyDeltaConditionalFormatting(ws);

  // Freeze the header rows so the table scrolls underneath them
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: TABLE_HEADER_ROW }];

  if (name) {
    wb.title = name;
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
