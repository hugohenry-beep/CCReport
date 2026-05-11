import type { Worksheet } from "exceljs";
import { COUNTRY_ORDER } from "../metrics/paidMediaClassification";
import type { ChannelMetrics, CountryChannelRow, CountryKey } from "../types";
import {
  channelRow,
  countryTotalRow,
  DISPLAY_ROW_LIST,
  FIRST_COUNTRY_ROW,
  PAID_SEARCH_ROW_LIST,
  TABLE_HEADER_ROW,
  TOTAL_ROW,
  TOTAL_ROW_LIST,
} from "./cellMap";
import { deltaFormula, divideFormula, sumChannelRange, sumCells } from "./formulas";
import { STYLES } from "./styles";
import { NUMBER_FORMATS } from "./template";

const HEADERS: Array<{ col: string; label: string }> = [
  { col: "A", label: "Country" },
  { col: "B", label: "Spend (€)" },
  { col: "C", label: "LW Spend (€)" },
  { col: "D", label: "Δ" },
  { col: "E", label: "Clicks" },
  { col: "F", label: "LW Clicks" },
  { col: "G", label: "Δ" },
  { col: "H", label: "Cost per click (€)" },
  { col: "I", label: "Impressions" },
  { col: "J", label: "LW Imp." },
  { col: "K", label: "Δ" },
  { col: "L", label: "Paid Conversions" },
  { col: "M", label: "LW PC" },
  { col: "N", label: "Δ" },
  { col: "O", label: "Cost per paid conv. (€)" },
  { col: "P", label: "Total inbound leads" },
  { col: "Q", label: "LW Inbound" },
  { col: "R", label: "Δ" },
];

const COL_FORMATS: Record<string, string> = {
  B: NUMBER_FORMATS.currencyEur,
  C: NUMBER_FORMATS.currencyEur,
  D: NUMBER_FORMATS.percent,
  E: NUMBER_FORMATS.integer,
  F: NUMBER_FORMATS.integer,
  G: NUMBER_FORMATS.percent,
  H: NUMBER_FORMATS.currencyEur,
  I: NUMBER_FORMATS.integer,
  J: NUMBER_FORMATS.integer,
  K: NUMBER_FORMATS.percent,
  L: NUMBER_FORMATS.integer,
  M: NUMBER_FORMATS.integer,
  N: NUMBER_FORMATS.percent,
  O: NUMBER_FORMATS.currencyEur,
  P: NUMBER_FORMATS.integer,
  Q: NUMBER_FORMATS.integer,
  R: NUMBER_FORMATS.percent,
};

function getCountryRow(rows: CountryChannelRow[] | undefined, key: CountryKey): CountryChannelRow | undefined {
  return rows?.find((r) => r.country === key);
}

function writeChannelDataRow(
  ws: Worksheet,
  row: number,
  channelLabel: "Paid Search" | "Display",
  current: ChannelMetrics | undefined,
  prior: ChannelMetrics | undefined,
): void {
  ws.getCell(`A${row}`).value = channelLabel;
  ws.getCell(`A${row}`).style = STYLES.channelLabel;

  // Current period values
  if (current) {
    ws.getCell(`B${row}`).value = current.spend;
    ws.getCell(`E${row}`).value = current.clicks;
    ws.getCell(`I${row}`).value = current.impressions;
    ws.getCell(`L${row}`).value = current.paidConversions;
    ws.getCell(`P${row}`).value = current.inboundLeads;
  }
  // Prior (LW) values
  if (prior) {
    ws.getCell(`C${row}`).value = prior.spend;
    ws.getCell(`F${row}`).value = prior.clicks;
    ws.getCell(`J${row}`).value = prior.impressions;
    ws.getCell(`M${row}`).value = prior.paidConversions;
    ws.getCell(`Q${row}`).value = prior.inboundLeads;
  }

  // Deltas (always formulas — work whether values present or blank)
  ws.getCell(`D${row}`).value = { formula: deltaFormula(`B${row}`, `C${row}`).slice(1) };
  ws.getCell(`G${row}`).value = { formula: deltaFormula(`E${row}`, `F${row}`).slice(1) };
  ws.getCell(`K${row}`).value = { formula: deltaFormula(`I${row}`, `J${row}`).slice(1) };
  ws.getCell(`N${row}`).value = { formula: deltaFormula(`L${row}`, `M${row}`).slice(1) };
  ws.getCell(`R${row}`).value = { formula: deltaFormula(`P${row}`, `Q${row}`).slice(1) };

  // CPC and Cost/Conv (computed)
  ws.getCell(`H${row}`).value = { formula: divideFormula(`B${row}`, `E${row}`).slice(1) };
  ws.getCell(`O${row}`).value = { formula: divideFormula(`B${row}`, `L${row}`).slice(1) };

  applyColumnFormatsAndStyle(ws, row, STYLES.channelValue);
}

function writeCountryTotalRow(ws: Worksheet, country: CountryKey, row: number): void {
  ws.getCell(`A${row}`).value = country;
  ws.getCell(`A${row}`).style = STYLES.countryLabel;
  const ps = row + 1;
  const di = row + 2;

  ws.getCell(`B${row}`).value = { formula: sumChannelRange("B", ps, di).slice(1) };
  ws.getCell(`C${row}`).value = { formula: sumChannelRange("C", ps, di).slice(1) };
  ws.getCell(`D${row}`).value = { formula: deltaFormula(`B${row}`, `C${row}`).slice(1) };
  ws.getCell(`E${row}`).value = { formula: sumChannelRange("E", ps, di).slice(1) };
  ws.getCell(`F${row}`).value = { formula: sumChannelRange("F", ps, di).slice(1) };
  ws.getCell(`G${row}`).value = { formula: deltaFormula(`E${row}`, `F${row}`).slice(1) };
  // Master used =AVERAGE(...) here (unweighted) — we use weighted spend/clicks.
  ws.getCell(`H${row}`).value = { formula: divideFormula(`B${row}`, `E${row}`).slice(1) };
  ws.getCell(`I${row}`).value = { formula: sumChannelRange("I", ps, di).slice(1) };
  ws.getCell(`J${row}`).value = { formula: sumChannelRange("J", ps, di).slice(1) };
  ws.getCell(`K${row}`).value = { formula: deltaFormula(`I${row}`, `J${row}`).slice(1) };
  ws.getCell(`L${row}`).value = { formula: sumChannelRange("L", ps, di).slice(1) };
  ws.getCell(`M${row}`).value = { formula: sumChannelRange("M", ps, di).slice(1) };
  ws.getCell(`N${row}`).value = { formula: deltaFormula(`L${row}`, `M${row}`).slice(1) };
  ws.getCell(`O${row}`).value = { formula: divideFormula(`B${row}`, `L${row}`).slice(1) };
  ws.getCell(`P${row}`).value = { formula: sumChannelRange("P", ps, di).slice(1) };
  ws.getCell(`Q${row}`).value = { formula: sumChannelRange("Q", ps, di).slice(1) };
  ws.getCell(`R${row}`).value = { formula: deltaFormula(`P${row}`, `Q${row}`).slice(1) };

  applyColumnFormatsAndStyle(ws, row, STYLES.countryTotalCell);
}

function writeGrandTotalRow(ws: Worksheet): void {
  const row = TOTAL_ROW;
  ws.getCell(`A${row}`).value = "Total";
  ws.getCell(`A${row}`).style = STYLES.grandTotalLabel;

  const totalRefs = (col: string) => TOTAL_ROW_LIST.map((r) => `${col}${r}`);

  ws.getCell(`B${row}`).value = { formula: sumCells(totalRefs("B")).slice(1) };
  ws.getCell(`C${row}`).value = { formula: sumCells(totalRefs("C")).slice(1) };
  ws.getCell(`D${row}`).value = { formula: deltaFormula(`B${row}`, `C${row}`).slice(1) };
  ws.getCell(`E${row}`).value = { formula: sumCells(totalRefs("E")).slice(1) };
  ws.getCell(`F${row}`).value = { formula: sumCells(totalRefs("F")).slice(1) };
  ws.getCell(`G${row}`).value = { formula: deltaFormula(`E${row}`, `F${row}`).slice(1) };
  ws.getCell(`H${row}`).value = { formula: divideFormula(`B${row}`, `E${row}`).slice(1) };
  ws.getCell(`I${row}`).value = { formula: sumCells(totalRefs("I")).slice(1) };
  ws.getCell(`J${row}`).value = { formula: sumCells(totalRefs("J")).slice(1) };
  ws.getCell(`K${row}`).value = { formula: deltaFormula(`I${row}`, `J${row}`).slice(1) };
  ws.getCell(`L${row}`).value = { formula: sumCells(totalRefs("L")).slice(1) };
  ws.getCell(`M${row}`).value = { formula: sumCells(totalRefs("M")).slice(1) };
  ws.getCell(`N${row}`).value = { formula: deltaFormula(`L${row}`, `M${row}`).slice(1) };
  ws.getCell(`O${row}`).value = { formula: divideFormula(`B${row}`, `L${row}`).slice(1) };
  ws.getCell(`P${row}`).value = { formula: sumCells(totalRefs("P")).slice(1) };
  ws.getCell(`Q${row}`).value = { formula: sumCells(totalRefs("Q")).slice(1) };
  ws.getCell(`R${row}`).value = { formula: deltaFormula(`P${row}`, `Q${row}`).slice(1) };

  applyColumnFormatsAndStyle(ws, row, STYLES.grandTotalValue);
}

function applyColumnFormatsAndStyle(ws: Worksheet, row: number, baseStyle: object): void {
  for (const { col } of HEADERS) {
    if (col === "A") continue;
    const cell = ws.getCell(`${col}${row}`);
    cell.style = { ...baseStyle, numFmt: COL_FORMATS[col] };
  }
}

export function buildCountryTable(
  ws: Worksheet,
  currentRows: CountryChannelRow[] | undefined,
  priorRows: CountryChannelRow[] | undefined,
): void {
  // Section title row (14)
  ws.getCell("A14").value = "Total Paid Media";
  ws.getCell("A14").style = STYLES.sectionTitle;

  // Header row (15)
  for (const { col, label } of HEADERS) {
    const cell = ws.getCell(`${col}${TABLE_HEADER_ROW}`);
    cell.value = label;
    cell.style = STYLES.header;
  }

  // Country sections
  for (const key of COUNTRY_ORDER) {
    const totalRow = countryTotalRow(key);
    const psRow = channelRow(key, "paidSearch");
    const diRow = channelRow(key, "display");
    const currentEntry = getCountryRow(currentRows, key);
    const priorEntry = getCountryRow(priorRows, key);

    writeCountryTotalRow(ws, key, totalRow);
    writeChannelDataRow(ws, psRow, "Paid Search", currentEntry?.paidSearch, priorEntry?.paidSearch);
    writeChannelDataRow(ws, diRow, "Display", currentEntry?.display, priorEntry?.display);
  }

  writeGrandTotalRow(ws);

  // Make sure first-country row is preceded by header
  if (FIRST_COUNTRY_ROW !== TABLE_HEADER_ROW + 1) {
    throw new Error("FIRST_COUNTRY_ROW must be exactly one row below TABLE_HEADER_ROW");
  }
}

// Silence unused-import warning for PAID_SEARCH_ROW_LIST / DISPLAY_ROW_LIST during type-check.
void PAID_SEARCH_ROW_LIST;
void DISPLAY_ROW_LIST;
