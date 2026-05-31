import type { SnapshotRange, SnapshotSummary } from "@/lib/snapshots";

export type ChartDisplayMode = "dollar" | "percent";

export type NetWorthChartPoint = {
  date: string;
  label: string;
  xIndex: number;
  netWorth: number;
  chartValue: number;
};

export function formatDayLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** @deprecated Use formatDayLabel for chart points; kept for non-chart uses if needed. */
export function formatChartLabel(
  dateStr: string,
  range: SnapshotRange,
): string {
  return formatDayLabel(dateStr);
}

export function buildNetWorthChartData(
  snapshots: SnapshotSummary[],
  currentNetWorth: number,
  range: SnapshotRange,
  displayMode: ChartDisplayMode = "dollar",
): NetWorthChartPoint[] {
  const basePoints =
    snapshots.length === 0
      ? [
          {
            date: new Date().toISOString().slice(0, 10),
            netWorth: currentNetWorth,
          },
        ]
      : snapshots.map((snapshot) => ({
          date: snapshot.date,
          netWorth: snapshot.netWorth,
        }));

  const baseline = basePoints[0]?.netWorth ?? currentNetWorth;

  return basePoints.map((point, index) => {
    const chartValue =
      displayMode === "percent"
        ? baseline !== 0
          ? ((point.netWorth - baseline) / Math.abs(baseline)) * 100
          : 0
        : point.netWorth;

    return {
      date: point.date,
      label: formatDayLabel(point.date),
      xIndex: index,
      netWorth: point.netWorth,
      chartValue,
    };
  });
}

/** Minimum horizontal pixels per data point before the chart becomes scrollable. */
export const CHART_PIXELS_PER_POINT = 6;

export function getTodayPointIndex(
  chartData: NetWorthChartPoint[],
  today: string,
): number {
  const exact = chartData.findIndex((point) => point.date === today);
  if (exact >= 0) {
    return exact;
  }
  return Math.max(chartData.length - 1, 0);
}

export function getViewportIndexRange(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
  maxIndex: number,
): { viewStartIndex: number; viewEndIndex: number } {
  if (maxIndex <= 0 || scrollWidth <= clientWidth) {
    return { viewStartIndex: 0, viewEndIndex: maxIndex };
  }

  const startRatio = scrollLeft / scrollWidth;
  const endRatio = (scrollLeft + clientWidth) / scrollWidth;

  return {
    viewStartIndex: startRatio * maxIndex,
    viewEndIndex: endRatio * maxIndex,
  };
}

export function isTodayInViewport(
  todayIndex: number,
  viewStartIndex: number,
  viewEndIndex: number,
): boolean {
  const padding = 0.25;
  return (
    todayIndex >= viewStartIndex - padding &&
    todayIndex <= viewEndIndex + padding
  );
}

export function getChartContentWidth(
  pointCount: number,
  viewportWidth: number,
): number {
  if (pointCount <= 0) {
    return viewportWidth;
  }
  return Math.max(viewportWidth, pointCount * CHART_PIXELS_PER_POINT);
}

export const CHART_MARGIN = {
  top: 28,
  right: 4,
  left: 4,
  bottom: 22,
} as const;

/** 4–6 tick indices spanning the currently visible viewport. */
export function getVisibleXAxisTicks(
  viewStartIndex: number,
  viewEndIndex: number,
  maxIndex: number,
  targetCount = 5,
): number[] {
  if (maxIndex <= 0) {
    return [0];
  }

  const start = Math.max(0, Math.floor(viewStartIndex));
  const end = Math.min(maxIndex, Math.ceil(viewEndIndex));
  const span = end - start;

  if (span <= 0) {
    return [start];
  }

  const count = Math.min(Math.max(targetCount, 4), 6, span + 1);
  const ticks: number[] = [];

  for (let i = 0; i < count; i++) {
    const index =
      count === 1
        ? start
        : Math.round(start + (i / (count - 1)) * span);
    ticks.push(index);
  }

  return [...new Set(ticks)].sort((a, b) => a - b);
}

export function scrubIndexFromClientX(
  clientX: number,
  innerRect: DOMRect,
  pointCount: number,
): number | null {
  if (pointCount <= 0) {
    return null;
  }

  const plotLeft = CHART_MARGIN.left;
  const plotWidth = innerRect.width - CHART_MARGIN.left - CHART_MARGIN.right;

  if (plotWidth <= 0) {
    return null;
  }

  const localX = clientX - innerRect.left;
  const ratio = (localX - plotLeft) / plotWidth;
  const clamped = Math.max(0, Math.min(1, ratio));
  return clamped * Math.max(pointCount - 1, 0);
}

export function interpolateChartPoint(
  chartData: NetWorthChartPoint[],
  exactIndex: number,
): {
  exactIndex: number;
  dataIndex: number;
  chartValue: number;
  netWorth: number;
} {
  if (chartData.length === 0) {
    return { exactIndex: 0, dataIndex: 0, chartValue: 0, netWorth: 0 };
  }

  const maxIndex = chartData.length - 1;
  const clamped = Math.max(0, Math.min(maxIndex, exactIndex));
  const i0 = Math.floor(clamped);
  const i1 = Math.min(i0 + 1, maxIndex);
  const t = i1 > i0 ? clamped - i0 : 0;
  const p0 = chartData[i0]!;
  const p1 = chartData[i1]!;

  return {
    exactIndex: clamped,
    dataIndex: Math.round(clamped),
    chartValue: p0.chartValue + t * (p1.chartValue - p0.chartValue),
    netWorth: p0.netWorth + t * (p1.netWorth - p0.netWorth),
  };
}

export function getRangeLabel(range: SnapshotRange): string {
  if (range === "YTD") {
    return "Year to date";
  }
  if (range === "ALL") {
    return "All time";
  }
  return range;
}

export function getChangeHorizonLabel(range: SnapshotRange): string {
  switch (range) {
    case "1M":
      return "since last month";
    case "3M":
      return "since 3 mo ago";
    case "6M":
      return "since 6 mo ago";
    case "1Y":
      return "since last year";
    case "YTD":
      return "since start of year";
    case "ALL":
      return "all time";
  }
}

export function computeNetWorthChange(
  value: number,
  baseline: number,
): { changeAmount: number; changePercent: number } {
  const changeAmount = value - baseline;
  const changePercent =
    baseline !== 0 ? (changeAmount / Math.abs(baseline)) * 100 : 0;

  return { changeAmount, changePercent };
}
