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
import type { DayOfWeekCountryRow } from "@/lib/types";
import { ChartCard } from "./ChartCard";

interface StackedBarChartProps {
  title?: string;
  description?: string;
  data: DayOfWeekCountryRow[];
}

const SEGMENT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-6)",
];
const OTHER_COLOR = "var(--text-subtle)";
const OTHER_KEY = "Other";

export function StackedBarChart({ title, description, data }: StackedBarChartProps) {
  if (!data.length) return null;

  const countryOrder = deriveCountryOrder(data);
  if (countryOrder.length === 0) return null;

  const rows = data.map((r) => {
    const flat: Record<string, number | string> = { day: r.day };
    for (const c of countryOrder) flat[c] = r.byCountry[c] ?? 0;
    return flat;
  });

  return (
    <ChartCard title={title} description={description}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            stroke="var(--text-muted)"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            stroke="var(--text-subtle)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            allowDecimals={false}
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
            formatter={(value: unknown) =>
              typeof value === "number" ? value.toLocaleString() : String(value)
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          {countryOrder.map((country, i) => (
            <Bar
              key={country}
              dataKey={country}
              stackId="leads"
              fill={colorFor(country, i, countryOrder)}
              name={country}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function deriveCountryOrder(data: DayOfWeekCountryRow[]): string[] {
  const totals = new Map<string, number>();
  for (const r of data) {
    for (const [country, count] of Object.entries(r.byCountry)) {
      totals.set(country, (totals.get(country) ?? 0) + count);
    }
  }
  // Largest segments at the bottom of the stack, "Other" last.
  return Array.from(totals.entries())
    .filter(([, v]) => v > 0)
    .sort((a, b) => {
      if (a[0] === OTHER_KEY) return 1;
      if (b[0] === OTHER_KEY) return -1;
      return b[1] - a[1];
    })
    .map(([k]) => k);
}

function colorFor(country: string, index: number, order: string[]): string {
  if (country === OTHER_KEY) return OTHER_COLOR;
  // Skip the "Other" slot when assigning palette colors so non-Other countries
  // get a stable mapping regardless of whether Other is present.
  const nonOtherIndex = order.slice(0, index).filter((c) => c !== OTHER_KEY).length;
  return SEGMENT_COLORS[nonOtherIndex % SEGMENT_COLORS.length];
}
