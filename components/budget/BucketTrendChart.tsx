"use client";

import { useChartColors } from "@/lib/chart-colors";
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
  const colors = useChartColors();
  if (trends.length === 0) return null;

  const data = trends.map((t) => ({
    month: monthTick(t.month),
    spent: t.spent,
    target: t.target,
  }));

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
        Spend vs budget
      </p>
      <div className="mt-3 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.hairline} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-ink-secondary"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-ink-secondary"
              tickFormatter={(v: number) => {
                if (v >= 1000) {
                  const k = v / 1000;
                  return Number.isInteger(k) ? `$${k}k` : `$${k.toFixed(1)}k`;
                }
                return `$${Math.round(v)}`;
              }}
              width={44}
            />
            <Tooltip
              formatter={(value, name) => [
                formatCurrency(Number(value ?? 0)),
                name === "spent" ? "Spent" : "Budget",
              ]}
              labelFormatter={(label) => `Month ${label}`}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--hairline)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="spent" fill={colors.gain} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Line
              type="monotone"
              dataKey="target"
              stroke={colors.inkMuted}
              strokeWidth={2}
              dot={{ r: 3, fill: colors.inkMuted }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
