"use client";

import {
  CHART_MARGIN,
  formatDayLabel,
  interpolateChartPoint,
  type NetWorthChartPoint,
} from "@/lib/chart-data";
import { formatCurrency } from "@/lib/format";
import {
  Area,
  AreaChart,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

export type ChartScrubDetail = {
  dataIndex: number;
  exactIndex: number;
  chartValue: number;
  netWorth: number;
  tooltipX: number;
  point: NetWorthChartPoint;
};

type NetWorthChartPlotProps = {
  chartData: NetWorthChartPoint[];
  scrub: ChartScrubDetail | null;
  xAxisTicks: number[];
};

export function NetWorthChartPlot({
  chartData,
  scrub,
  xAxisTicks,
}: NetWorthChartPlotProps) {
  const maxXIndex = Math.max(chartData.length - 1, 0);

  return (
    <AreaChart
      data={chartData}
      margin={{
        top: CHART_MARGIN.top,
        right: CHART_MARGIN.right,
        left: CHART_MARGIN.left,
        bottom: CHART_MARGIN.bottom,
      }}
    >
      <defs>
        <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
        </linearGradient>
      </defs>

      <XAxis
        dataKey="xIndex"
        type="number"
        domain={[0, maxXIndex]}
        ticks={xAxisTicks}
        axisLine={false}
        tickLine={false}
        tick={{ fill: "#71717a", fontSize: 11 }}
        tickFormatter={(index) => {
          const point = chartData[Math.round(index)];
          return point ? formatDayLabel(point.date) : "";
        }}
        dy={8}
      />

      <YAxis hide domain={["dataMin", "dataMax"]} padding={{ top: 12, bottom: 8 }} />

      <Area
        type="monotone"
        dataKey="chartValue"
        stroke="#34d399"
        strokeWidth={2}
        fill="url(#netWorthFill)"
        baseValue="dataMin"
        dot={chartData.length === 1 ? { r: 4, fill: "#34d399" } : false}
        activeDot={false}
        isAnimationActive
        animationDuration={500}
        animationEasing="ease-out"
      />

      {scrub ? (
        <>
          <ReferenceLine
            x={scrub.exactIndex}
            stroke="#34d399"
            strokeWidth={1}
            strokeDasharray="4 4"
            ifOverflow="hidden"
          />
          <ReferenceDot
            x={scrub.exactIndex}
            y={scrub.chartValue}
            r={5}
            fill="#34d399"
            stroke="#ecfdf5"
            strokeWidth={2}
            ifOverflow="hidden"
          />
        </>
      ) : null}
    </AreaChart>
  );
}

export function ChartHoverTooltip({ scrub }: { scrub: ChartScrubDetail }) {
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-800/95 px-2.5 py-1.5 text-xs text-white shadow-lg ring-1 ring-zinc-700"
      style={{ left: scrub.tooltipX, top: 4 }}
    >
      <p className="font-medium text-zinc-300">
        {formatDayLabel(scrub.point.date)}
      </p>
      <p className="tabular-nums">{formatCurrency(scrub.netWorth)}</p>
    </div>
  );
}
