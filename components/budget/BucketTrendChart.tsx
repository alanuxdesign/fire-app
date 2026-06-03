"use client";

import { formatCurrency } from "@/lib/format";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type BucketTrendPoint = {
  month: string;
  spent: number;
  target: number;
};

type BucketTrendChartProps = {
  trends: BucketTrendPoint[];
  months?: number;
};

function monthTick(month: string): string {
  return month.slice(5);
}

export function BucketTrendChart({ trends }: BucketTrendChartProps) {
  if (trends.length === 0) return null;

  const data = trends.map((t) => ({
    month: monthTick(t.month),
    spent: t.spent,
    target: t.target,
  }));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Spend vs budget
      </p>
      <div className="mt-3 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-zinc-500"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-zinc-500"
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
              }
              width={40}
            />
            <Tooltip
              formatter={(value, name) => [
                formatCurrency(Number(value ?? 0)),
                name === "spent" ? "Spent" : "Budget",
              ]}
              labelFormatter={(label) => `Month ${label}`}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="spent" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Line
              type="monotone"
              dataKey="target"
              stroke="#a1a1aa"
              strokeWidth={2}
              dot={{ r: 3, fill: "#a1a1aa" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
