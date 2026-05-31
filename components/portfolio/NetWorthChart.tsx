"use client";

import {
  ChartHoverTooltip,
  NetWorthChartPlot,
  type ChartScrubDetail,
} from "@/components/portfolio/NetWorthChartPlot";
import {
  buildNetWorthChartData,
  CHART_MARGIN,
  computeNetWorthChange,
  getChangeHorizonLabel,
  getChartContentWidth,
  getTodayPointIndex,
  getViewportIndexRange,
  getVisibleXAxisTicks,
  interpolateChartPoint,
  isTodayInViewport,
  scrubIndexFromClientX,
} from "@/lib/chart-data";
import { getTodayDateString } from "@/lib/dates";
import type { SnapshotRange, SnapshotSummary } from "@/lib/snapshots";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveContainer } from "recharts";

const RANGES: SnapshotRange[] = ["1M", "3M", "6M", "1Y", "YTD", "ALL"];
const PAN_THRESHOLD_PX = 6;

export type NetWorthDisplay = {
  netWorth: number;
  changePercent: number;
  changeAmount: number;
  changeHorizonLabel: string;
  showBackToToday: boolean;
};

type NetWorthChartProps = {
  currentNetWorth: number;
  onDisplayChange: (display: NetWorthDisplay) => void;
  onRegisterBackToToday?: (handler: () => void) => void;
  refreshKey?: number;
};

export function NetWorthChart({
  currentNetWorth,
  onDisplayChange,
  onRegisterBackToToday,
  refreshKey = 0,
}: NetWorthChartProps) {
  const [range, setRange] = useState<SnapshotRange>("YTD");
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrub, setScrub] = useState<ChartScrubDetail | null>(null);
  const [todayInView, setTodayInView] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [visibleTicks, setVisibleTicks] = useState<number[]>([0]);
  const [isPanning, setIsPanning] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const chartInnerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    isPan: boolean;
  } | null>(null);

  const chartData = useMemo(
    () =>
      buildNetWorthChartData(snapshots, currentNetWorth, range, "dollar"),
    [snapshots, currentNetWorth, range],
  );

  const baselineNetWorth = chartData[0]?.netWorth ?? currentNetWorth;
  const latestIndex = Math.max(chartData.length - 1, 0);
  const latestNetWorth =
    chartData[latestIndex]?.netWorth ?? currentNetWorth;
  const today = getTodayDateString();
  const todayIndex = getTodayPointIndex(chartData, today);
  const chartContentWidth = getChartContentWidth(
    chartData.length,
    viewportWidth,
  );
  const isScrollable = chartContentWidth > viewportWidth && viewportWidth > 0;
  const changeHorizonLabel = getChangeHorizonLabel(range);

  const scrollToToday = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, []);

  const readViewport = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return {
        viewStartIndex: 0,
        viewEndIndex: latestIndex,
        inView: true,
      };
    }

    const maxIndex = Math.max(chartData.length - 1, 0);
    const { viewStartIndex, viewEndIndex } = getViewportIndexRange(
      el.scrollLeft,
      el.clientWidth,
      el.scrollWidth,
      maxIndex,
    );
    const inView = isTodayInViewport(todayIndex, viewStartIndex, viewEndIndex);

    return { viewStartIndex, viewEndIndex, inView };
  }, [chartData.length, latestIndex, todayIndex]);

  const syncViewport = useCallback(() => {
    const { viewStartIndex, viewEndIndex, inView } = readViewport();
    setTodayInView(inView);
    setVisibleTicks(
      getVisibleXAxisTicks(
        viewStartIndex,
        viewEndIndex,
        Math.max(chartData.length - 1, 0),
      ),
    );
  }, [chartData.length, readViewport]);

  const publishDisplay = useCallback(
    (scrubDetail: ChartScrubDetail | null, inView: boolean) => {
      const scrubIndex = scrubDetail?.dataIndex ?? null;
      const point =
        scrubIndex !== null && chartData[scrubIndex]
          ? chartData[scrubIndex]
          : chartData[latestIndex];
      const displayNetWorth =
        scrubDetail?.netWorth ?? point?.netWorth ?? latestNetWorth;

      const { changePercent } = computeNetWorthChange(
        displayNetWorth,
        baselineNetWorth,
      );

      onDisplayChange({
        netWorth: displayNetWorth,
        changePercent,
        changeAmount: displayNetWorth - baselineNetWorth,
        changeHorizonLabel,
        showBackToToday: !inView,
      });
    },
    [
      baselineNetWorth,
      changeHorizonLabel,
      chartData,
      latestIndex,
      latestNetWorth,
      onDisplayChange,
    ],
  );

  const updateScrubFromClientX = useCallback(
    (clientX: number) => {
      const inner = chartInnerRef.current;
      if (!inner || chartData.length === 0) {
        return;
      }

      const exactIndex = scrubIndexFromClientX(
        clientX,
        inner.getBoundingClientRect(),
        chartData.length,
      );

      if (exactIndex === null) {
        return;
      }

      const interpolated = interpolateChartPoint(chartData, exactIndex);
      const point = chartData[interpolated.dataIndex] ?? chartData[0]!;
      const innerRect = inner.getBoundingClientRect();
      const plotWidth =
        innerRect.width - CHART_MARGIN.left - CHART_MARGIN.right;
      const tooltipX =
        CHART_MARGIN.left +
        (interpolated.exactIndex / Math.max(chartData.length - 1, 1)) *
          plotWidth;

      const detail: ChartScrubDetail = {
        dataIndex: interpolated.dataIndex,
        exactIndex: interpolated.exactIndex,
        chartValue: interpolated.chartValue,
        netWorth: interpolated.netWorth,
        tooltipX,
        point,
      };

      setScrub(detail);
    },
    [chartData],
  );

  const clearScrub = useCallback(() => {
    setScrub(null);
  }, []);

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
    const el = viewportRef.current;
    if (!el) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setViewportWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    setViewportWidth(el.clientWidth);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setScrub(null);
    requestAnimationFrame(() => {
      scrollToToday();
      syncViewport();
      publishDisplay(null, true);
    });
  }, [range, chartData, scrollToToday, syncViewport, publishDisplay]);

  useEffect(() => {
    publishDisplay(scrub, todayInView);
  }, [scrub, todayInView, currentNetWorth, snapshots, publishDisplay]);

  const handleBackToToday = useCallback(() => {
    setScrub(null);
    scrollToToday();
    syncViewport();
    publishDisplay(null, true);
  }, [publishDisplay, scrollToToday, syncViewport]);

  useEffect(() => {
    onRegisterBackToToday?.(handleBackToToday);
  }, [handleBackToToday, onRegisterBackToToday]);

  const handleScroll = useCallback(() => {
    syncViewport();
  }, [syncViewport]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isScrollable || event.button !== 0) {
        return;
      }

      const el = scrollRef.current;
      if (!el) {
        return;
      }

      panRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startScrollLeft: el.scrollLeft,
        isPan: false,
      };
    },
    [isScrollable],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pan = panRef.current;
      const el = scrollRef.current;

      if (pan && el && pan.pointerId === event.pointerId) {
        const deltaX = event.clientX - pan.startX;

        if (!pan.isPan && Math.abs(deltaX) >= PAN_THRESHOLD_PX) {
          pan.isPan = true;
          setIsPanning(true);
          clearScrub();
          el.setPointerCapture(event.pointerId);
        }

        if (pan.isPan) {
          event.preventDefault();
          el.scrollLeft = pan.startScrollLeft - deltaX;
          return;
        }
      }

      if (!isPanning) {
        updateScrubFromClientX(event.clientX);
      }
    },
    [clearScrub, isPanning, updateScrubFromClientX],
  );

  const endPan = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pan = panRef.current;
      const el = scrollRef.current;

      if (pan && el && pan.pointerId === event.pointerId && pan.isPan) {
        if (el.hasPointerCapture(event.pointerId)) {
          el.releasePointerCapture(event.pointerId);
        }
      }

      panRef.current = null;
      setIsPanning(false);
      syncViewport();
    },
    [syncViewport],
  );

  const handlePointerLeave = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (panRef.current?.isPan) {
        return;
      }
      clearScrub();
    },
    [clearScrub],
  );

  return (
    <div className="px-2 pb-4">
      <div ref={viewportRef} className="h-40 w-full">
        {loading ? (
          <div className="h-full animate-pulse rounded-lg bg-zinc-900" />
        ) : (
          <div
            ref={scrollRef}
            className={`h-full w-full overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
              isScrollable
                ? "overflow-x-auto cursor-grab active:cursor-grabbing"
                : "overflow-x-hidden"
            }`}
            onScroll={handleScroll}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPan}
            onPointerCancel={endPan}
            onPointerLeave={handlePointerLeave}
          >
            <div
              ref={chartInnerRef}
              className="relative h-full"
              style={{
                width: chartContentWidth,
                minWidth: "100%",
              }}
            >
              {scrub ? <ChartHoverTooltip scrub={scrub} /> : null}

              <ResponsiveContainer width="100%" height="100%">
                <NetWorthChartPlot
                  key={`${range}-${chartContentWidth}`}
                  chartData={chartData}
                  scrub={scrub}
                  xAxisTicks={visibleTicks}
                />
              </ResponsiveContainer>
            </div>
          </div>
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
