"use client";

import {
  CHART_MARGIN,
  formatDayLabel,
  type NetWorthChartPoint,
} from "@/lib/chart-data";
import { useChartColors } from "@/lib/chart-colors";
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
  hoverDateLabel: string;
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
  const colors = useChartColors();

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
          <stop offset="0%" stopColor={colors.gain} stopOpacity={0.42} />
          <stop offset="55%" stopColor={colors.gain} stopOpacity={0.14} />
          <stop offset="100%" stopColor={colors.gain} stopOpacity={0} />
        </linearGradient>
      </defs>

      <XAxis
        dataKey="xIndex"
        type="number"
        domain={[0, maxXIndex]}
        ticks={xAxisTicks}
        axisLine={false}
        tickLine={false}
        tick={{ fill: colors.inkMuted, fontSize: 11 }}
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
        stroke={colors.gain}
        strokeWidth={2.5}
        fill="url(#netWorthFill)"
        baseValue="dataMin"
        dot={chartData.length === 1 ? { r: 4, fill: colors.gain } : false}
        activeDot={false}
        isAnimationActive
        animationDuration={500}
        animationEasing="ease-out"
      />

      {scrub ? (
        <>
          <ReferenceLine
            x={scrub.exactIndex}
            stroke={colors.gain}
            strokeWidth={1}
            strokeDasharray="4 4"
            ifOverflow="hidden"
          />
          <ReferenceDot
            x={scrub.exactIndex}
            y={scrub.chartValue}
            r={5}
            fill={colors.gain}
            stroke="var(--surface-raised)"
            strokeWidth={2}
            ifOverflow="hidden"
          />
        </>
      ) : null}
    </AreaChart>
  );
}

export function ChartScrubDateTooltip({ scrub }: { scrub: ChartScrubDetail }) {
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink/95 px-2.5 py-1.5 text-xs font-medium text-canvas shadow-card ring-1 ring-hairline"
      style={{ left: scrub.tooltipX, top: 4 }}
    >
      {scrub.hoverDateLabel}
    </div>
  );
}

