"use client";

import type { CashFlowPoint } from "@/lib/budget-types";
import { useChartColors } from "@/lib/chart-colors";
import { formatCurrency } from "@/lib/format";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CashFlowChartProps = {
  series: CashFlowPoint[];
};

function monthTick(month: string): string {
  return month.slice(5);
}

export function CashFlowChart({ series }: CashFlowChartProps) {
  const colors = useChartColors();
  if (series.length === 0) return null;

  const data = series.map((p) => ({
    month: monthTick(p.month),
    income: p.income,
    expense: p.expense,
    net: p.net,
  }));

  return (
    <div className="border-t border-hairline pt-5">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
        How the seasons flow
      </p>
      <div className="mt-3 h-48 w-full">
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
                const abs = Math.abs(v);
                if (abs >= 1000) {
                  const k = abs / 1000;
                  return v < 0 ? `-$${k % 1 === 0 ? k : k.toFixed(1)}k` : `$${k % 1 === 0 ? k : k.toFixed(1)}k`;
                }
                return formatCurrency(v);
              }}
              width={48}
            />
            <Tooltip
              formatter={(value, name) => [
                formatCurrency(Number(value ?? 0)),
                name === "income"
                  ? "Income"
                  : name === "expense"
                    ? "Expense"
                    : "Net",
              ]}
              labelFormatter={(label) => `Month ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="income" fill={colors.gain} radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Bar dataKey="expense" fill={colors.olive} radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Line type="monotone" dataKey="net" stroke={colors.primary} strokeWidth={2} dot={{ r: 2, fill: colors.primary }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
