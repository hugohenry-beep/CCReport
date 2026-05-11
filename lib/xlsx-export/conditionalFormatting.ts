import type { Worksheet } from "exceljs";
import {
  DISPLAY_ROW_LIST,
  PAID_SEARCH_ROW_LIST,
  TOTAL_ROW,
  TOTAL_ROW_LIST,
} from "./cellMap";

const DELTA_COLUMNS = ["D", "G", "K", "N", "R"] as const;

function deltaRangeForColumn(col: string): string {
  const allDataRows = [...TOTAL_ROW_LIST, ...PAID_SEARCH_ROW_LIST, ...DISPLAY_ROW_LIST, TOTAL_ROW].sort(
    (a, b) => a - b,
  );
  return allDataRows.map((r) => `${col}${r}`).join(" ");
}

export function applyDeltaConditionalFormatting(ws: Worksheet): void {
  for (const col of DELTA_COLUMNS) {
    const ref = deltaRangeForColumn(col);
    ws.addConditionalFormatting({
      ref,
      rules: [
        {
          type: "cellIs",
          operator: "lessThan",
          formulae: ["0"],
          priority: 1,
          style: {
            font: { color: { argb: "FF9C0006" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } },
          },
        },
        {
          type: "cellIs",
          operator: "greaterThan",
          formulae: ["0"],
          priority: 2,
          style: {
            font: { color: { argb: "FF006100" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } },
          },
        },
      ],
    });
  }
}
