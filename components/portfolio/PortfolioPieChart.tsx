"use client";

import { AccountRow } from "@/components/portfolio/AccountRow";
import type {
  AccountGroupResponse,
  AccountListItem,
  AccountsApiResponse,
} from "@/lib/account-groups";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getSegmentColor } from "@/lib/portfolio-views";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type PortfolioPieChartProps = {
  groups: AccountGroupResponse[];
  data: AccountsApiResponse;
  onAccountClick: (account: AccountListItem) => void;
};

type PieDatum = {
  name: string;
  value: number;
  color: string;
  percent: number;
  accounts: AccountGroupResponse["accounts"];
};

export function PortfolioPieChart({
  groups,
  data,
  onAccountClick,
}: PortfolioPieChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const pieData = useMemo<PieDatum[]>(() => {
    const total = data.totalAssets + data.totalLiabilities;

    return groups
      .filter((group) => group.total > 0)
      .map((group, index) => ({
        name: group.type,
        value: group.total,
        color: getSegmentColor(index),
        percent: total > 0 ? (group.total / total) * 100 : 0,
        accounts: group.accounts,
      }));
  }, [groups, data.totalAssets, data.totalLiabilities]);

  const selected = pieData[activeIndex] ?? pieData[0];

  if (pieData.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          No holdings to chart yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white px-2 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative mx-auto h-64 w-full max-w-sm">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={2}
                isAnimationActive
                animationDuration={450}
                onClick={(_data, index) => {
                  if (typeof index === "number") {
                    setActiveIndex(index);
                  }
                }}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    stroke={activeIndex === index ? "#0f172a" : "#fff"}
                    strokeWidth={activeIndex === index ? 2 : 1}
                    className="cursor-pointer outline-none"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, item) => {
                  const amount =
                    typeof value === "number" ? value : Number(value ?? 0);
                  const name = (item?.payload as PieDatum | undefined)?.name;
                  return [formatCurrency(amount), name ?? ""];
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              Net Worth
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
              {formatCurrency(data.netWorth)}
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 px-3">
          {pieData.map((entry, index) => (
            <button
              key={entry.name}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`inline-flex items-center gap-1.5 text-xs ${
                activeIndex === index
                  ? "font-semibold text-slate-900"
                  : "text-slate-600"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name} ({formatPercent(entry.percent, { signed: false })})
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-stone-100 px-4 py-3 dark:border-zinc-800">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                {selected.name}
              </h3>
              <p className="text-base font-bold tabular-nums text-slate-900 dark:text-zinc-100">
                {formatCurrency(selected.value)}
              </p>
            </div>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
              {formatPercent(selected.percent, { signed: false })} of portfolio
            </p>
          </div>
          <div className="divide-y divide-stone-100 px-4 dark:divide-zinc-800">
            {selected.accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                onClick={onAccountClick}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
