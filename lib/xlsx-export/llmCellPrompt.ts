import { COUNTRY_ORDER } from "../metrics/paidMediaClassification";
import type { Metrics } from "../types";
import { channelRow, countryTotalRow } from "./cellMap";

export interface CellDescriptor {
  address: string;
  field: string;
  period: "current" | "prior";
}

export const XLSX_CELL_VALUE_PROMPT = `You are a deterministic Excel cell-value emitter. You output JSON only.

Inputs:
1. METRICS_JSON: a fully-resolved Metrics object containing current + prior period data, including paidMediaByCountry (11 rows in fixed order: USA, UK, Canada, France, DACH, Spain, Nordics, Netherlands, Italy, LATAM, Australia).
2. CELL_SCHEMA: an array of cell descriptors {address, field, period} where field is a dotted path into METRICS_JSON and period is "current" | "prior".

Task: produce an object mapping each address to its raw numeric value, by reading directly from METRICS_JSON at the given path. Do not compute deltas, totals, ratios, or formulas — those are filled in by the workbook's own =formulas.

HARD RULES — violating any of these makes the output invalid:
- Output ONLY a single JSON object: {"B17": 3279.02, "E17": 383, ...}. No prose, no markdown, no comments.
- Every value must be COPIED VERBATIM from METRICS_JSON at the specified path. Do not round, transform, or normalize.
- If the path resolves to null, undefined, NaN, or missing, output null for that cell. Never invent, estimate, infer, or extrapolate.
- Do not emit any cell address not present in CELL_SCHEMA.
- Numeric values are emitted as JSON numbers, not strings. Strings stay strings.
- If METRICS_JSON.paidMediaByCountry is absent, output null for every paid-media cell — do not attempt reconstruction.
- Treat every input number as authoritative ground truth. The goal is to REPORT, not to embellish, smooth, correct, or comment.

Self-check before outputting: every value you write must be greppable inside METRICS_JSON. If you cannot literally grep it, output null instead.`;

const CHANNEL_PATH: Record<"paidSearch" | "display", string> = {
  paidSearch: "paidSearch",
  display: "display",
};

const METRIC_TO_COLUMN: Array<{ col: string; metric: keyof Record<string, number>; metricName: string }> = [
  { col: "B", metricName: "spend", metric: "spend" },
  { col: "E", metricName: "clicks", metric: "clicks" },
  { col: "I", metricName: "impressions", metric: "impressions" },
  { col: "L", metricName: "paidConversions", metric: "paidConversions" },
  { col: "P", metricName: "inboundLeads", metric: "inboundLeads" },
];

const LW_COLUMN: Record<string, string> = {
  B: "C",
  E: "F",
  I: "J",
  L: "M",
  P: "Q",
};

export function buildCellSchema(): CellDescriptor[] {
  const out: CellDescriptor[] = [];
  for (const country of COUNTRY_ORDER) {
    const countryIndex = COUNTRY_ORDER.indexOf(country);
    void countryTotalRow; // total rows are derived in-workbook via formulas; LLM only fills leaf cells
    for (const channelKey of ["paidSearch", "display"] as const) {
      const row = channelRow(country, channelKey);
      for (const { col, metricName } of METRIC_TO_COLUMN) {
        const basePath = `paidMediaByCountry[${countryIndex}].${CHANNEL_PATH[channelKey]}.${metricName}`;
        out.push({ address: `${col}${row}`, field: basePath, period: "current" });
        const lwCol = LW_COLUMN[col];
        if (lwCol) {
          out.push({ address: `${lwCol}${row}`, field: basePath, period: "prior" });
        }
      }
    }
  }
  return out;
}

export function buildPromptInputs(metrics: Metrics): {
  systemPrompt: string;
  metrics: Metrics;
  schema: CellDescriptor[];
} {
  return {
    systemPrompt: XLSX_CELL_VALUE_PROMPT,
    metrics,
    schema: buildCellSchema(),
  };
}
