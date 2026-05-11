import type { Borders, Fill, Font, Style } from "exceljs";

const THIN_BORDER: Partial<Borders> = {
  top: { style: "thin", color: { argb: "FFBFBFBF" } },
  left: { style: "thin", color: { argb: "FFBFBFBF" } },
  right: { style: "thin", color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
};

const HEADER_FILL: Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEDEDED" },
};

const SECTION_FILL: Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFDDEBF7" },
};

const COUNTRY_TOTAL_FILL: Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF2F2F2" },
};

const GRAND_TOTAL_FILL: Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9E1F2" },
};

const BOLD_FONT: Partial<Font> = { bold: true };
const ITALIC_MUTED_FONT: Partial<Font> = { italic: true, color: { argb: "FF808080" } };

export const STYLES = {
  header: {
    font: BOLD_FONT,
    fill: HEADER_FILL,
    border: THIN_BORDER,
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
  } as Partial<Style>,
  sectionTitle: {
    font: { bold: true, size: 13 },
    fill: SECTION_FILL,
    alignment: { horizontal: "left", vertical: "middle" },
  } as Partial<Style>,
  summaryLabel: {
    font: BOLD_FONT,
    fill: HEADER_FILL,
    border: THIN_BORDER,
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
  } as Partial<Style>,
  summaryValue: {
    border: THIN_BORDER,
    alignment: { horizontal: "right", vertical: "middle" },
  } as Partial<Style>,
  countryLabel: {
    font: BOLD_FONT,
    fill: COUNTRY_TOTAL_FILL,
    border: THIN_BORDER,
    alignment: { horizontal: "left", vertical: "middle" },
  } as Partial<Style>,
  countryTotalCell: {
    font: BOLD_FONT,
    fill: COUNTRY_TOTAL_FILL,
    border: THIN_BORDER,
    alignment: { horizontal: "right", vertical: "middle" },
  } as Partial<Style>,
  channelLabel: {
    border: THIN_BORDER,
    alignment: { horizontal: "left", vertical: "middle", indent: 1 },
  } as Partial<Style>,
  channelValue: {
    border: THIN_BORDER,
    alignment: { horizontal: "right", vertical: "middle" },
  } as Partial<Style>,
  grandTotalLabel: {
    font: { bold: true, size: 12 },
    fill: GRAND_TOTAL_FILL,
    border: THIN_BORDER,
    alignment: { horizontal: "left", vertical: "middle" },
  } as Partial<Style>,
  grandTotalValue: {
    font: { bold: true, size: 12 },
    fill: GRAND_TOTAL_FILL,
    border: THIN_BORDER,
    alignment: { horizontal: "right", vertical: "middle" },
  } as Partial<Style>,
  warningBanner: {
    font: { bold: true, color: { argb: "FF7F6000" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } } as Fill,
    alignment: { horizontal: "left", vertical: "middle", wrapText: true },
    border: THIN_BORDER,
  } as Partial<Style>,
  muted: { font: ITALIC_MUTED_FONT } as Partial<Style>,
};

export const COLUMN_FORMATS: Record<string, string> = {
  // From master template:
  // B/C (spend), H (CPC), O (cost/conv): EUR
  // D/G/K/N/R (deltas): percent
  // E/F (clicks), I/J (impressions), L/M (paid conv), P/Q (inbound): integer
};
