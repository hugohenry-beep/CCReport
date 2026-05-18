"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "./ChartCard";

interface ComparisonBarChartProps {
  title?: string;
  description?: string;
  data: { metric: string; current: number; prior: number; currentLabel?: string; priorLabel?: string }[];
  valueFormatter?: (n: number) => string;
}

export function ComparisonBarChart({ title, description, data, valueFormatter }: ComparisonBarChartProps) {
  if (!data.length) return null;
  const fmt = valueFormatter ?? ((n: number) => String(n));
  return (
    <ChartCard title={title} description={description}>
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 60)}>
        <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={24}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="metric"
            stroke="var(--text-muted)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            stroke="var(--text-subtle)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tickFormatter={(v: number) => fmt(v)}
            width={56}
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
            formatter={(value, name) => [fmt(typeof value === "number" ? value : Number(value)), name]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} iconType="circle" />
          <Bar name="Prior" dataKey="prior" fill="var(--surface-3)" radius={[4, 4, 0, 0]} />
          <Bar name="Current" dataKey="current" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
