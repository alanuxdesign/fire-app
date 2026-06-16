"use client";

import { AccountRow } from "@/components/portfolio/AccountRow";
import type {
  AccountGroupResponse,
  AccountListItem,
  AccountsApiResponse,
} from "@/lib/account-groups";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getSegmentColor } from "@/lib/portfolio-views";
import { useChartColors } from "@/lib/chart-colors";
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
  const chartColors = useChartColors();

  const pieData = useMemo<PieDatum[]>(() => {
    const total = data.totalAssets + data.totalLiabilities;

    return groups
      .filter((group) => group.total > 0)
      .map((group, index) => ({
        name: group.type,
        value: group.total,
        color: getSegmentColor(index, chartColors.segments),
        percent: total > 0 ? (group.total / total) * 100 : 0,
        accounts: group.accounts,
      }));
  }, [groups, data.totalAssets, data.totalLiabilities, chartColors.segments]);

  const selected = pieData[activeIndex] ?? pieData[0];

  if (pieData.length === 0) {
    return (
      <div className="border-t border-hairline px-4 py-12 text-center">
        <p className="text-sm text-ink-soft">
          Nothing to chart yet — link an account to see how it&apos;s spread.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
      <div className="relative overflow-hidden px-2 py-4">
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
                    stroke={activeIndex === index ? "var(--ds-ink)" : "var(--ds-paper)"}
                    strokeWidth={activeIndex === index ? 2 : 1.5}
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
            <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Net worth
            </p>
            <p className="mt-0.5 font-display text-[1.9rem] leading-none tracking-[-0.015em] tabular-nums text-ink">
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
                  ? "font-semibold text-ink"
                  : "text-ink-secondary"
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
        <section className="overflow-hidden">
          <div className="border-b border-hairline px-2 pb-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-[1.35rem] leading-tight text-ink">
                {selected.name}
              </h3>
              <p className="text-base font-semibold tabular-nums text-ink">
                {formatCurrency(selected.value)}
              </p>
            </div>
            <p className="mt-0.5 text-sm text-ink-soft">
              {formatPercent(selected.percent, { signed: false })} of your garden
            </p>
          </div>
          <div className="divide-y divide-line-soft px-2">
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
