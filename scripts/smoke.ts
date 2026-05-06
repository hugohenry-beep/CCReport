/* eslint-disable */
import * as fs from "node:fs";
import * as path from "node:path";
import { parseAll } from "../lib/parsers";
import type { NamedFile } from "../lib/parsers/unzip";
import { compute } from "../lib/metrics/compute";
import { renderTemplatedMarkdown } from "../lib/render/templated";

async function main() {
  const refDir = path.resolve(__dirname, "../referencexlsx");
  const files: NamedFile[] = [];

  // Top-level files
  for (const entry of fs.readdirSync(refDir)) {
    const full = path.join(refDir, entry);
    if (!fs.statSync(full).isFile()) continue;
    if (!/\.(xlsx|zip)$/i.test(entry)) continue;
    if (entry.startsWith(".")) continue;
    files.push({ name: entry, buffer: fs.readFileSync(full) });
  }

  console.log("Uploaded files:", files.map((f) => f.name));

  const datasets = parseAll(files);
  console.log("\n=== Parsed datasets ===");
  console.log("Files processed:");
  for (const f of datasets.files) {
    console.log(` - ${f.name} -> ${f.kind} (${f.rowCount} rows${f.note ? ", " + f.note : ""})`);
  }
  console.log(`Leads: ${datasets.leads.length}`);
  console.log(`Lead-stage deals: ${datasets.leadStageDeals.length}`);
  console.log(`Paid pipe deals: ${datasets.paidPipeDeals.length}`);
  console.log(`Closed-won deals: ${datasets.closedWonDeals.length}`);
  console.log(`Regional deals: ${datasets.regionalDeals.length}`);
  console.log(`Campaigns: ${datasets.campaigns.length}`);
  console.log(`Ads period label: ${datasets.adsPeriodLabel}`);
  if (datasets.warnings.length) console.log("Warnings:", datasets.warnings);

  // Pick the period that the dashboard zip describes (April 27 - May 4 2026).
  const start = new Date("2026-04-27T00:00:00Z");
  const end = new Date("2026-05-05T00:00:00Z"); // exclusive end
  const metrics = compute(datasets, { range: { start, end } });

  console.log("\n=== Computed metrics (current period) ===");
  console.log({
    inboundLeadCount: metrics.current.inboundLeadCount,
    bySource: metrics.current.bySource,
    byStage: metrics.current.byStage,
    adSpend: metrics.current.adSpend,
    totalDealValue: metrics.current.totalDealValue,
    costPerLead: metrics.current.costPerLead,
    highValueDeals: metrics.current.highValueDeals,
    demoCount: metrics.current.demoCount,
    negotiatingCount: metrics.current.negotiatingCount,
    enteredContractLiveCount: metrics.current.enteredContractLiveCount,
    enteredContractLiveDeals: metrics.current.enteredContractLiveDeals,
  });

  if (metrics.prior) {
    console.log("\n=== Prior period (from same upload) ===");
    console.log({
      inboundLeadCount: metrics.prior.inboundLeadCount,
      adSpend: metrics.prior.adSpend,
      totalDealValue: metrics.prior.totalDealValue,
    });
    console.log("Comparison source:", metrics.comparisonInfo.source);
  } else {
    console.log("\nNo prior period derivable from upload.");
  }

  const md = renderTemplatedMarkdown(metrics);
  const outPath = path.resolve(__dirname, "../scripts/smoke-output.md");
  fs.writeFileSync(outPath, md);
  console.log("\nMarkdown report written to", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
