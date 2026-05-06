import * as XLSX from "xlsx";

export type Row = Record<string, unknown>;

export function readWorkbook(buf: Buffer): XLSX.WorkBook {
  return XLSX.read(buf, { type: "buffer", cellDates: true });
}

export function detailSheetName(wb: XLSX.WorkBook): string {
  const names = wb.SheetNames;
  const detail = names.find((n) => !n.toLowerCase().includes("hubspot export summary"));
  return detail ?? names[names.length - 1];
}

export function rowsFromSheet(wb: XLSX.WorkBook, sheetName: string, headerRow = 1): Row[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const range = headerRow === 1 ? undefined : { range: headerRow - 1 };
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: null, raw: false, ...(range as object) });
}

export function rowsFromSheetWithRange(wb: XLSX.WorkBook, sheetName: string, headerRowIndex: number): Row[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Row>(ws, {
    defval: null,
    raw: false,
    range: headerRowIndex,
  });
}

export function getString(row: Row, ...keys: string[]): string | null {
  for (const k of keys) {
    if (k in row && row[k] != null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
  }
  return null;
}

export function getNumber(row: Row, ...keys: string[]): number | null {
  for (const k of keys) {
    if (k in row && row[k] != null && row[k] !== "") {
      const cleaned = String(row[k]).replace(/[,€$£\s]/g, "").replace(/[^\d.\-]/g, "");
      const n = Number(cleaned);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

export function getDate(row: Row, ...keys: string[]): Date | null {
  for (const k of keys) {
    if (k in row && row[k] != null && row[k] !== "") {
      const v = row[k];
      if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
      const d = new Date(String(v));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

export function findHeader(row: Row, predicate: (key: string) => boolean): string | null {
  return Object.keys(row).find(predicate) ?? null;
}

export function pickKey(row: Row | undefined, predicate: (key: string) => boolean): string | null {
  if (!row) return null;
  return findHeader(row, predicate);
}
