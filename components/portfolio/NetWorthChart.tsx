"use client";

import {
  buildNetWorthChartData,
  computeNetWorthChange,
  type NetWorthChartPoint,
} from "@/lib/chart-data";
import { formatCurrency } from "@/lib/format";
import type { SnapshotRange, SnapshotSummary } from "@/lib/snapshots";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RANGES: SnapshotRange[] = ["1M", "3M", "6M", "1Y", "YTD", "ALL"];

export type NetWorthDisplay = {
  netWorth: number;
  changePercent: number;
};

type NetWorthChartProps = {
  currentNetWorth: number;
  onDisplayChange: (display: NetWorthDisplay) => void;
  refreshKey?: number;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: NetWorthChartPoint }>;
};

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div className="rounded-md bg-zinc-800/95 px-2.5 py-1.5 text-xs text-white shadow-lg ring-1 ring-zinc-700">
      <p className="font-medium text-zinc-300">{point.label}</p>
      <p className="tabular-nums">{formatCurrency(point.netWorth)}</p>
    </div>
  );
}

export function NetWorthChart({
  currentNetWorth,
  onDisplayChange,
  refreshKey = 0,
}: NetWorthChartProps) {
  const [range, setRange] = useState<SnapshotRange>("YTD");
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = useMemo(
    () => buildNetWorthChartData(snapshots, currentNetWorth, range),
    [snapshots, currentNetWorth, range],
  );

  const baselineNetWorth = chartData[0]?.netWorth ?? currentNetWorth;
  const latestNetWorth =
    chartData[chartData.length - 1]?.netWorth ?? currentNetWorth;

  const updateDisplay = useCallback(
    (index: number | null) => {
      const point =
        index !== null && chartData[index]
          ? chartData[index]
          : { netWorth: latestNetWorth };

      const { changePercent } = computeNetWorthChange(
        point.netWorth,
        baselineNetWorth,
      );

      onDisplayChange({
        netWorth: point.netWorth,
        changePercent,
      });
    },
    [baselineNetWorth, chartData, latestNetWorth, onDisplayChange],
  );

  const loadSnapshots = useCallback(async (selectedRange: SnapshotRange) => {
    setLoading(true);

    try {
      const response = await fetch(`/api/snapshots?range=${selectedRange}`);
      if (!response.ok) {
        throw new Error("Failed to load snapshots");
      }

      const body = (await response.json()) as { snapshots: SnapshotSummary[] };
      setSnapshots(body.snapshots);
    } catch {
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshots(range);
  }, [range, loadSnapshots, refreshKey]);

  useEffect(() => {
    setActiveIndex(null);
    updateDisplay(null);
  }, [range, chartData, updateDisplay]);

  useEffect(() => {
    if (activeIndex === null) {
      updateDisplay(null);
    }
  }, [activeIndex, currentNetWorth, snapshots, updateDisplay]);

  const resolveActiveIndex = (
    index: number | string | null | undefined,
  ): number | undefined => {
    if (index === null || index === undefined) {
      return undefined;
    }
    const resolved = typeof index === "number" ? index : Number(index);
    return Number.isFinite(resolved) ? resolved : undefined;
  };

  const handleChartInteraction = (index: number | string | null | undefined) => {
    const resolved = resolveActiveIndex(index);
    if (resolved === undefined) {
      setActiveIndex(null);
      updateDisplay(null);
      return;
    }

    setActiveIndex(resolved);
    updateDisplay(resolved);
  };

  return (
    <div className="px-2 pb-4">
      <div className="h-40 w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-zinc-500">Loading chart…</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              key={range}
              data={chartData}
              margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
              onMouseMove={(state) =>
                handleChartInteraction(state?.activeTooltipIndex)
              }
              onMouseLeave={() => handleChartInteraction(undefined)}
              onTouchMove={(state) =>
                handleChartInteraction(state?.activeTooltipIndex)
              }
              onTouchEnd={() => handleChartInteraction(undefined)}
            >
              <defs>
                <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={28}
                dy={8}
              />

              <YAxis hide domain={["auto", "auto"]} />

              <Tooltip
                content={<ChartTooltip />}
                cursor={{
                  stroke: "#34d399",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
                isAnimationActive={false}
              />

              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#34d399"
                strokeWidth={2}
                fill="url(#netWorthFill)"
                dot={chartData.length === 1 ? { r: 4, fill: "#34d399" } : false}
                activeDot={{
                  r: 5,
                  fill: "#34d399",
                  stroke: "#ecfdf5",
                  strokeWidth: 2,
                }}
                isAnimationActive
                animationDuration={500}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5 px-1">
        {RANGES.map((option) => {
          const isActive = range === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                  : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
