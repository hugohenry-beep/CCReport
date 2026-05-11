/* eslint-disable */
import * as fs from "node:fs";
import * as path from "node:path";
import ExcelJS from "exceljs";
import { parseAll } from "../lib/parsers";
import type { NamedFile } from "../lib/parsers/unzip";
import { compute } from "../lib/metrics/compute";
import { renderReportXlsx } from "../lib/xlsx-export";
import { COUNTRY_ORDER } from "../lib/metrics/paidMediaClassification";
import { channelRow, countryTotalRow, TOTAL_ROW } from "../lib/xlsx-export/cellMap";

async function main() {
  const candidates = [
    path.resolve(__dirname, "../referencexlsx"),
    "/Users/hugohenry/Desktop/DevCC/inboundLeadReport/referencexlsx",
  ];
  const refDir = candidates.find((p) => fs.existsSync(p));
  if (!refDir) throw new Error("referencexlsx not found in candidates: " + candidates.join(", "));
  const files: NamedFile[] = [];
  for (const entry of fs.readdirSync(refDir)) {
    const full = path.join(refDir, entry);
    if (!fs.statSync(full).isFile()) continue;
    if (!/\.(xlsx|zip)$/i.test(entry)) continue;
    if (entry.startsWith(".")) continue;
    files.push({ name: entry, buffer: fs.readFileSync(full) });
  }

  const datasets = parseAll(files);
  console.log(`Parsed ${datasets.campaigns.length} campaigns, ${datasets.leads.length} leads`);
  if (datasets.warnings.length) console.log("Warnings:", datasets.warnings);

  const start = new Date("2026-04-27T00:00:00Z");
  const end = new Date("2026-05-04T00:00:00Z");
  const metrics = compute(datasets, { range: { start, end } });

  console.log("\n=== paidMediaByCountry (current) ===");
  for (const row of metrics.current.paidMediaByCountry ?? []) {
    const ps = row.paidSearch;
    const di = row.display;
    console.log(
      `${row.country.padEnd(12)}  PS spend=${ps.spend.toFixed(2)}, clicks=${ps.clicks}, imp=${ps.impressions}, conv=${ps.paidConversions}, leads=${ps.inboundLeads}   |   Display spend=${di.spend.toFixed(2)}, clicks=${di.clicks}, imp=${di.impressions}, conv=${di.paidConversions}, leads=${di.inboundLeads}`,
    );
  }
  if (metrics.current.unclassifiedCampaigns?.length) {
    console.log("\nUnclassified campaigns:", metrics.current.unclassifiedCampaigns);
  }

  const buf = await renderReportXlsx(metrics, "Smoke Test");
  const outPath = path.resolve(__dirname, "../tmp-smoke-output.xlsx");
  fs.writeFileSync(outPath, buf);
  console.log(`\nWrote ${buf.length} bytes to ${outPath}`);

  // Read it back and verify structure
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as any);
  const ws = wb.worksheets[0];
  console.log(`Sheet: "${ws.name}", ${ws.actualRowCount} rows, ${ws.actualColumnCount} cols`);

  for (const country of COUNTRY_ORDER) {
    const tr = countryTotalRow(country);
    const psR = channelRow(country, "paidSearch");
    const diR = channelRow(country, "display");
    console.log(
      `  ${country}: totalRow=${tr} (A=${ws.getCell(`A${tr}`).value}), PS=${psR} (A=${ws.getCell(`A${psR}`).value}, B=${ws.getCell(`B${psR}`).value}), Display=${diR} (A=${ws.getCell(`A${diR}`).value})`,
    );
  }
  console.log(`  GRAND TOTAL row ${TOTAL_ROW}: A=${ws.getCell(`A${TOTAL_ROW}`).value}, B(formula)=${JSON.stringify(ws.getCell(`B${TOTAL_ROW}`).value)}`);

  const merges = (ws as any).model?.merges ?? [];
  console.log(`Merged ranges (${merges.length}):`, merges);

  const cf = (ws as any).conditionalFormattings ?? [];
  console.log(`Conditional formattings: ${cf.length}`);

  // Validate a couple of leaf values match expected from the master sheet for USA
  const usaTotal = countryTotalRow("USA");
  const usaPsRow = channelRow("USA", "paidSearch");
  console.log(`\nSpot check USA Paid Search spend at B${usaPsRow}:`, ws.getCell(`B${usaPsRow}`).value);
  console.log(`USA total row B${usaTotal} (formula):`, ws.getCell(`B${usaTotal}`).value);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
