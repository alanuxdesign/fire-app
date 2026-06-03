"use client";

import type { CashFlowPoint } from "@/lib/budget-types";
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
  if (series.length === 0) return null;

  const data = series.map((p) => ({
    month: monthTick(p.month),
    income: p.income,
    expense: p.expense,
    net: p.net,
  }));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Cash flow
      </p>
      <div className="mt-3 h-48 w-full">
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
            <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Line type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
