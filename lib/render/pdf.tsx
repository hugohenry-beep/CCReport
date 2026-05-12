import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import * as React from "react";
import type { Metrics } from "../types";
import { fmtDate, fmtDateRange, fmtMoney, fmtNumber, fmtPct } from "./format";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1d23" },
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 4, borderBottom: "2 solid #4f46e5", paddingBottom: 4 },
  h2: { fontSize: 13, fontWeight: 700, marginTop: 14, marginBottom: 4 },
  meta: { fontSize: 9, color: "#5a6370", marginBottom: 4 },
  p: { marginBottom: 4 },
  bullet: { marginBottom: 2 },
  table: { display: "flex", flexDirection: "column", borderTop: "1 solid #d4d7dd", borderLeft: "1 solid #d4d7dd", marginTop: 4, marginBottom: 6 },
  row: { flexDirection: "row" },
  th: { flexGrow: 1, flexBasis: 0, padding: 4, borderRight: "1 solid #d4d7dd", borderBottom: "1 solid #d4d7dd", backgroundColor: "#f4f5f8", fontWeight: 700 },
  td: { flexGrow: 1, flexBasis: 0, padding: 4, borderRight: "1 solid #d4d7dd", borderBottom: "1 solid #d4d7dd" },
  small: { fontSize: 9, color: "#5a6370" },
});

function BreakdownTable<T extends { count: number; pct: number }>(props: {
  keyLabel: string;
  emptyMessage: string;
  currentRows: T[];
  priorRows: T[] | undefined;
  hasPrior: boolean;
  keyOf: (row: T) => string;
}) {
  if (props.currentRows.length === 0) {
    return <Text style={styles.p}>{props.emptyMessage}</Text>;
  }
  const hasComparablePrior = props.hasPrior && props.priorRows != null;
  const priorMap = new Map((props.priorRows ?? []).map((r) => [props.keyOf(r), r.count]));
  return (
    <View style={styles.table}>
      <View style={styles.row}>
        <Text style={styles.th}>{props.keyLabel}</Text>
        <Text style={styles.th}>Count</Text>
        <Text style={styles.th}>% total</Text>
        <Text style={styles.th}>Prior</Text>
        <Text style={styles.th}>Δ vs prior</Text>
      </View>
      {props.currentRows.map((r, i) => {
        const key = props.keyOf(r);
        const prior = priorMap.get(key) ?? 0;
        let deltaLabel: string;
        if (!hasComparablePrior) deltaLabel = "—";
        else if (prior === 0) deltaLabel = r.count > 0 ? "(new)" : "→ 0";
        else {
          const change = ((r.count - prior) / prior) * 100;
          const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "→";
          const sign = change > 0 ? "+" : "";
          deltaLabel = `${arrow} ${sign}${change.toFixed(1)}%`;
        }
        return (
          <View style={styles.row} key={i}>
            <Text style={styles.td}>{key}</Text>
            <Text style={styles.td}>{fmtNumber(r.count)}</Text>
            <Text style={styles.td}>{fmtPct(r.pct)}</Text>
            <Text style={styles.td}>{hasComparablePrior ? fmtNumber(prior) : "—"}</Text>
            <Text style={styles.td}>{deltaLabel}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ReportPdf({ metrics }: { metrics: Metrics }) {
  const c = metrics.current;
  const p = metrics.prior;

  const cmpLabel =
    metrics.comparisonInfo.source === "current_upload"
      ? "(derived from this upload)"
      : metrics.comparisonInfo.source === "stored_snapshot"
      ? "(from stored snapshot)"
      : "(no prior data)";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Inbound Lead Report</Text>
        <Text style={styles.meta}>Period: {fmtDateRange(metrics.periodStart, metrics.periodEnd)}</Text>
        <Text style={styles.meta}>
          Prior period: {fmtDateRange(metrics.priorPeriodStart, metrics.priorPeriodEnd)} {cmpLabel}
        </Text>
        {metrics.adsPeriodLabel ? (
          <Text style={styles.meta}>Google Ads export period: {metrics.adsPeriodLabel}</Text>
        ) : null}

        <Text style={styles.h2}>Headline numbers</Text>
        <Text style={styles.bullet}>• Inbound leads generated: {fmtNumber(c.inboundLeadCount)} {p ? `(prior: ${fmtNumber(p.inboundLeadCount)})` : ""}</Text>
        <Text style={styles.bullet}>• Total Google Ads spend: {fmtMoney(c.adSpend)} {p ? `(prior: ${fmtMoney(p.adSpend)})` : ""}</Text>
        <Text style={styles.bullet}>• Total deal value created: {fmtMoney(c.totalDealValue)} {p ? `(prior: ${fmtMoney(p.totalDealValue)})` : ""}</Text>
        <Text style={styles.bullet}>• Cost per inbound lead: {c.costPerLead != null ? fmtMoney(c.costPerLead) : "—"} {p?.costPerLead != null ? `(prior: ${fmtMoney(p.costPerLead)})` : ""}</Text>

        <Text style={styles.h2}>Inbound leads by source</Text>
        <BreakdownTable
          keyLabel="Source"
          emptyMessage="No source data available."
          currentRows={c.bySource}
          priorRows={p?.bySource}
          hasPrior={p != null}
          keyOf={(r) => r.source}
        />

        <Text style={styles.h2}>Inbound leads by pipeline stage</Text>
        <BreakdownTable
          keyLabel="Stage"
          emptyMessage="No deal-stage data available for this period."
          currentRows={c.byStage}
          priorRows={p?.byStage}
          hasPrior={p != null}
          keyOf={(r) => r.stage}
        />

        <Text style={styles.h2}>Inbound leads by country</Text>
        <BreakdownTable
          keyLabel="Country"
          emptyMessage="No country data available."
          currentRows={c.byCountry ?? []}
          priorRows={p?.byCountry}
          hasPrior={p != null}
          keyOf={(r) => r.country}
        />

        <Text style={styles.h2}>Budget spend vs results</Text>
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.th}>Metric</Text>
            <Text style={styles.th}>Current</Text>
            <Text style={styles.th}>Prior</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.td}>Spend</Text>
            <Text style={styles.td}>{fmtMoney(c.adSpend)}</Text>
            <Text style={styles.td}>{p ? fmtMoney(p.adSpend) : "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.td}>Inbound leads</Text>
            <Text style={styles.td}>{fmtNumber(c.inboundLeadCount)}</Text>
            <Text style={styles.td}>{p ? fmtNumber(p.inboundLeadCount) : "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.td}>Pipeline created</Text>
            <Text style={styles.td}>{fmtMoney(c.totalDealValue)}</Text>
            <Text style={styles.td}>{p ? fmtMoney(p.totalDealValue) : "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.td}>Cost per lead</Text>
            <Text style={styles.td}>{c.costPerLead != null ? fmtMoney(c.costPerLead) : "—"}</Text>
            <Text style={styles.td}>{p?.costPerLead != null ? fmtMoney(p.costPerLead) : "—"}</Text>
          </View>
        </View>

        <Text style={styles.h2}>High-value inbound deals (&gt;$15,000)</Text>
        {c.highValueDeals.length === 0 ? (
          <Text style={styles.p}>No inbound deals over $15,000 were created in this period.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={styles.th}>Deal</Text>
              <Text style={styles.th}>Company</Text>
              <Text style={styles.th}>Amount</Text>
              <Text style={styles.th}>Stage</Text>
              <Text style={styles.th}>Created</Text>
            </View>
            {c.highValueDeals.map((d, i) => (
              <View style={styles.row} key={i}>
                <Text style={styles.td}>{d.dealName}</Text>
                <Text style={styles.td}>{d.company}</Text>
                <Text style={styles.td}>{fmtMoney(d.amount)}</Text>
                <Text style={styles.td}>{d.stage}</Text>
                <Text style={styles.td}>{fmtDate(d.createDate)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>Pipeline stage spotlight</Text>
        <Text style={styles.bullet}>• Currently in DEMO: {fmtNumber(c.demoCount)} {p ? `(prior: ${fmtNumber(p.demoCount)})` : ""}</Text>
        <Text style={styles.bullet}>• Currently in NEGOTIATING: {fmtNumber(c.negotiatingCount)} {p ? `(prior: ${fmtNumber(p.negotiatingCount)})` : ""}</Text>
        <Text style={styles.bullet}>• Entered "Contract is live" in this period: {fmtNumber(c.enteredContractLiveCount)} {p ? `(prior: ${fmtNumber(p.enteredContractLiveCount)})` : ""}</Text>

        {metrics.warnings && metrics.warnings.length > 0 ? (
          <>
            <Text style={styles.h2}>Notes</Text>
            {metrics.warnings.map((w, i) => (
              <Text key={i} style={styles.small}>• {w}</Text>
            ))}
          </>
        ) : null}
      </Page>
    </Document>
  );
}

export async function renderReportPdf(metrics: Metrics): Promise<Buffer> {
  const buf = await renderToBuffer(<ReportPdf metrics={metrics} />);
  return buf as Buffer;
}
