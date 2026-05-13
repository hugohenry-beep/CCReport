"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "./ChartCard";

interface BreakdownBarChartProps {
  title?: string;
  description?: string;
  data: { label: string; current: number; prior?: number }[];
  /** Optional accent rotation for distinct bar colors. */
  rotateColors?: boolean;
  /** Max bars to render — extra rows are collapsed into "Other". */
  maxBars?: number;
}

const BAR_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-4)",
];

export function BreakdownBarChart({
  title,
  description,
  data,
  rotateColors = false,
  maxBars = 8,
}: BreakdownBarChartProps) {
  if (!data.length) return null;
  let rows = data.slice();
  if (rows.length > maxBars) {
    const head = rows.slice(0, maxBars - 1);
    const rest = rows.slice(maxBars - 1);
    head.push({
      label: `Other (${rest.length})`,
      current: rest.reduce((s, r) => s + r.current, 0),
      prior: rest.reduce((s, r) => s + (r.prior ?? 0), 0) || undefined,
    });
    rows = head;
  }
  const height = Math.max(160, rows.length * 36 + 40);
  return (
    <ChartCard title={title} description={description}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
          barCategoryGap={6}
        >
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            stroke="var(--text-subtle)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            stroke="var(--text-muted)"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "var(--accent-soft)" }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--text)", fontWeight: 600 }}
            itemStyle={{ color: "var(--text-muted)" }}
          />
          <Bar dataKey="current" radius={[0, 4, 4, 0]} name="Current">
            {rows.map((_, i) => (
              <Cell
                key={i}
                fill={rotateColors ? BAR_COLORS[i % BAR_COLORS.length] : "var(--chart-1)"}
              />
            ))}
            <LabelList
              dataKey="current"
              position="right"
              style={{ fill: "var(--text-muted)", fontSize: 11 }}
              formatter={(v: unknown) =>
                typeof v === "number" ? v.toLocaleString() : String(v)
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
