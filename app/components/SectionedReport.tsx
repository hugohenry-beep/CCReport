"use client";

import { useMemo } from "react";
import type { Metrics } from "@/lib/types";
import { BreakdownBarChart } from "./charts/BreakdownBarChart";
import { ComparisonBarChart } from "./charts/ComparisonBarChart";

interface Section {
  id: string;
  title: string;
  html: string;
}

interface SectionedReportProps {
  bodyHtml: string;
  metrics: Metrics;
}

/**
 * Split a marked-rendered HTML string into sections at `<h2>` boundaries.
 * Returns the preamble + an array of sections. Each section's html is the inner
 * content (no h2 element — the h2 is rendered separately so we can attach an id).
 */
function splitByH2(html: string): { preamble: string; sections: Section[] } {
  const sections: Section[] = [];
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>/g;
  const opens: { index: number; title: string; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    opens.push({ index: m.index, title: stripTags(m[1]), end: re.lastIndex });
  }
  if (opens.length === 0) return { preamble: html, sections: [] };
  const preamble = html.slice(0, opens[0].index);
  for (let i = 0; i < opens.length; i++) {
    const start = opens[i].end;
    const stop = i + 1 < opens.length ? opens[i + 1].index : html.length;
    const inner = html.slice(start, stop).trim();
    sections.push({
      id: slugify(opens[i].title),
      title: opens[i].title,
      html: inner,
    });
  }
  return { preamble, sections };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Post-process delta cells inside tables — wraps "▲ +x%" / "▼ -x%" cells with
 * colored classes. Recognizes the patterns emitted by lib/render/templated.ts.
 */
function colorDeltaCells(html: string): string {
  return html.replace(
    /<td>([^<]*?(?:▲|▼|→)[^<]*?)<\/td>/g,
    (_, txt: string) => {
      const trimmed = txt.trim();
      let cls = "delta-flat";
      if (trimmed.startsWith("▲")) cls = "delta-up";
      else if (trimmed.startsWith("▼")) cls = "delta-down";
      return `<td class="${cls}">${trimmed}</td>`;
    },
  );
}

export function deriveSectionTitles(bodyHtml: string): { id: string; title: string }[] {
  return splitByH2(bodyHtml).sections.map(({ id, title }) => ({ id, title }));
}

export default function SectionedReport({ bodyHtml, metrics }: SectionedReportProps) {
  const { preamble, sections } = useMemo(() => splitByH2(bodyHtml), [bodyHtml]);
  const c = metrics.current;
  const p = metrics.prior;

  return (
    <article className="space-y-2">
      {preamble && (
        <div
          className="report-prose"
          dangerouslySetInnerHTML={{ __html: colorDeltaCells(preamble) }}
        />
      )}
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="scroll-mt-20 pt-2">
          <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight mt-6 mb-2 pb-1 border-b border-border">
            {s.title}
          </h2>
          <SectionEnhancements sectionId={s.id} metrics={metrics} />
          <div className="overflow-x-auto -mx-1 px-1">
            <div
              className="report-prose"
              dangerouslySetInnerHTML={{ __html: colorDeltaCells(s.html) }}
            />
          </div>
        </section>
      ))}
    </article>
  );

  function SectionEnhancements({ sectionId, metrics }: { sectionId: string; metrics: Metrics }) {
    if (sectionId === slugify("Headline numbers")) {
      const data = [
        { metric: "Leads", current: c.inboundLeadCount, prior: p?.inboundLeadCount ?? 0 },
        { metric: "Ad spend", current: c.adSpend, prior: p?.adSpend ?? 0 },
        { metric: "Pipeline", current: c.totalDealValue, prior: p?.totalDealValue ?? 0 },
      ];
      if (!p) return null;
      return (
        <div className="mb-4">
          <ComparisonBarChart
            title="Current vs prior period"
            description="Headline metrics across both periods."
            data={data}
          />
        </div>
      );
    }
    if (sectionId === slugify("Inbound leads by source") && c.bySource.length > 0) {
      return (
        <div className="mb-4">
          <BreakdownBarChart
            title="Leads by source"
            data={c.bySource.map((r) => ({
              label: r.source,
              current: r.count,
              prior: p?.bySource.find((x) => x.source === r.source)?.count,
            }))}
            rotateColors
          />
        </div>
      );
    }
    if (sectionId === slugify("Inbound leads by pipeline stage") && c.byStage.length > 0) {
      return (
        <div className="mb-4">
          <BreakdownBarChart
            title="Leads by pipeline stage"
            data={c.byStage.map((r) => ({
              label: r.stage,
              current: r.count,
              prior: p?.byStage.find((x) => x.stage === r.stage)?.count,
            }))}
          />
        </div>
      );
    }
    if (sectionId === slugify("Inbound leads by country") && (c.byCountry?.length ?? 0) > 0) {
      return (
        <div className="mb-4">
          <BreakdownBarChart
            title="Leads by country"
            data={c.byCountry.map((r) => ({
              label: r.country,
              current: r.count,
              prior: p?.byCountry?.find((x) => x.country === r.country)?.count,
            }))}
            rotateColors
          />
        </div>
      );
    }
    return null;
  }
}
