"use client";

import {
  ChartScrubDateTooltip,
  NetWorthChartPlot,
  type ChartScrubDetail,
} from "@/components/portfolio/NetWorthChartPlot";
import {
  BACKFILL_MIN_SNAPSHOT_COUNT,
  clearBackfillPending,
  isBackfillPending,
} from "@/lib/backfill-pending";
import {
  buildNetWorthChartData,
  CHART_MARGIN,
  computeNetWorthChange,
  hoverDateAtChartIndex,
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
const SCRUB_HOLD_MS = 250;

type ChartPointerMode = "pending" | "pan" | "scrub";

export type NetWorthDisplay = {
  netWorth: number;
  changePercent: number;
  changeAmount: number;
  changeHorizonLabel: string;
  showBackToToday: boolean;
  isEstimated: boolean;
};

type NetWorthChartProps = {
  currentNetWorth: number;
  onDisplayChange: (display: NetWorthDisplay) => void;
  onRegisterBackToToday?: (handler: () => void) => void;
  refreshKey?: number;
};

const POPULATING_MESSAGE_DELAY_MS = 2000;
const BACKFILL_POLL_INTERVAL_MS = 3000;

export function NetWorthChart({
  currentNetWorth,
  onDisplayChange,
  onRegisterBackToToday,
  refreshKey = 0,
}: NetWorthChartProps) {
  const [range, setRange] = useState<SnapshotRange>("YTD");
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfillPending, setBackfillPending] = useState(false);
  const [showPopulatingMessage, setShowPopulatingMessage] = useState(false);
  const [scrub, setScrub] = useState<ChartScrubDetail | null>(null);
  const [todayInView, setTodayInView] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [visibleTicks, setVisibleTicks] = useState<number[]>([0]);
  const [pointerMode, setPointerMode] = useState<ChartPointerMode | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const chartInnerRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    lastClientX: number;
    mode: ChartPointerMode;
    holdTimer: ReturnType<typeof setTimeout> | null;
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
        scrubDetail?.netWorth ?? currentNetWorth;
      const displayDate = scrubDetail?.point.date ?? point?.date ?? today;
      const displaySource = scrubDetail?.point.source ?? point?.source;
      const isEstimated =
        displaySource === "reconstructed" ||
        (scrubDetail !== null && displayDate !== today);

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
        isEstimated,
      });
    },
    [
      baselineNetWorth,
      changeHorizonLabel,
      chartData,
      latestIndex,
      latestNetWorth,
      onDisplayChange,
      today,
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
        hoverDateLabel: hoverDateAtChartIndex(
          chartData,
          interpolated.exactIndex,
        ),
        point,
      };

      setScrub(detail);
    },
    [chartData],
  );

  const clearScrub = useCallback(() => {
    setScrub(null);
  }, []);

  const loadSnapshots = useCallback(
    async (selectedRange: SnapshotRange, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const response = await fetch(`/api/snapshots?range=${selectedRange}`);
        if (!response.ok) {
          throw new Error("Failed to load snapshots");
        }

        const body = (await response.json()) as {
          snapshots: SnapshotSummary[];
        };
        setSnapshots(body.snapshots);

        if (body.snapshots.length >= BACKFILL_MIN_SNAPSHOT_COUNT) {
          clearBackfillPending();
          setBackfillPending(false);
          setShowPopulatingMessage(false);
        }

        return body.snapshots;
      } catch {
        setSnapshots([]);
        return [];
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (isBackfillPending()) {
      setBackfillPending(true);
    }
  }, [refreshKey]);

  useEffect(() => {
    loadSnapshots(range);
  }, [range, loadSnapshots, refreshKey]);

  useEffect(() => {
    if (!backfillPending) {
      return;
    }

    const delayTimer = window.setTimeout(() => {
      setShowPopulatingMessage(true);
    }, POPULATING_MESSAGE_DELAY_MS);

    const pollTimer = window.setInterval(() => {
      void loadSnapshots(range, { silent: true });
    }, BACKFILL_POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(delayTimer);
      window.clearInterval(pollTimer);
    };
  }, [backfillPending, loadSnapshots, range]);

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

  const clearHoldTimer = useCallback(() => {
    const interaction = interactionRef.current;
    if (interaction?.holdTimer) {
      clearTimeout(interaction.holdTimer);
      interaction.holdTimer = null;
    }
  }, []);

  const beginScrubMode = useCallback(
    (clientX: number) => {
      const interaction = interactionRef.current;
      const el = scrollRef.current;
      if (!interaction || !el) {
        return;
      }

      interaction.mode = "scrub";
      setPointerMode("scrub");
      el.setPointerCapture(interaction.pointerId);
      updateScrubFromClientX(clientX);
    },
    [updateScrubFromClientX],
  );

  const beginPanMode = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const interaction = interactionRef.current;
      const el = scrollRef.current;
      if (!interaction || !el || interaction.pointerId !== event.pointerId) {
        return;
      }

      clearHoldTimer();
      interaction.mode = "pan";
      setPointerMode("pan");
      clearScrub();
      el.setPointerCapture(event.pointerId);
    },
    [clearHoldTimer, clearScrub],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      const el = scrollRef.current;
      if (!el) {
        return;
      }

      clearHoldTimer();

      const interaction = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startScrollLeft: el.scrollLeft,
        lastClientX: event.clientX,
        mode: "pending" as const,
        holdTimer: null as ReturnType<typeof setTimeout> | null,
      };

      interactionRef.current = interaction;
      setPointerMode("pending");

      if (!isScrollable) {
        beginScrubMode(event.clientX);
        return;
      }

      interaction.holdTimer = setTimeout(() => {
        const current = interactionRef.current;
        if (!current || current.mode !== "pending") {
          return;
        }
        beginScrubMode(current.lastClientX);
      }, SCRUB_HOLD_MS);
    },
    [beginScrubMode, clearHoldTimer, isScrollable],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const interaction = interactionRef.current;
      const el = scrollRef.current;

      if (!interaction || !el || interaction.pointerId !== event.pointerId) {
        return;
      }

      interaction.lastClientX = event.clientX;
      const deltaX = event.clientX - interaction.startX;

      if (interaction.mode === "pending") {
        if (isScrollable && Math.abs(deltaX) >= PAN_THRESHOLD_PX) {
          beginPanMode(event);
        }
        return;
      }

      if (interaction.mode === "pan") {
        event.preventDefault();
        el.scrollLeft = interaction.startScrollLeft - deltaX;
        return;
      }

      if (interaction.mode === "scrub") {
        event.preventDefault();
        updateScrubFromClientX(event.clientX);
      }
    },
    [beginPanMode, isScrollable, updateScrubFromClientX],
  );

  const endInteraction = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const interaction = interactionRef.current;
      const el = scrollRef.current;

      clearHoldTimer();

      if (interaction && el && interaction.pointerId === event.pointerId) {
        if (el.hasPointerCapture(event.pointerId)) {
          el.releasePointerCapture(event.pointerId);
        }

        if (interaction.mode === "pan") {
          syncViewport();
        }

        if (interaction.mode === "scrub") {
          clearScrub();
        }
      }

      interactionRef.current = null;
      setPointerMode(null);
    },
    [clearHoldTimer, clearScrub, syncViewport],
  );

  const handlePointerLeave = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const interaction = interactionRef.current;
      if (!interaction || interaction.pointerId !== event.pointerId) {
        return;
      }

      if (interaction.mode === "pan" || interaction.mode === "pending") {
        return;
      }

      if (interaction.mode === "scrub") {
        clearScrub();
      }
    },
    [clearScrub],
  );

  useEffect(() => {
    return () => {
      clearHoldTimer();
    };
  }, [clearHoldTimer]);

  return (
    <div className="px-3 pb-4 pt-2">
      <div ref={viewportRef} className="h-44 w-full lg:h-72">
        {loading ||
        (showPopulatingMessage &&
          backfillPending &&
          snapshots.length < BACKFILL_MIN_SNAPSHOT_COUNT) ? (
          showPopulatingMessage ? (
            <div className="flex h-full items-center justify-center rounded-lg bg-canvas-sunken">
              <p className="text-sm font-medium text-ink-muted">
                Populating data…
              </p>
            </div>
          ) : (
            <div className="h-full animate-pulse rounded-lg bg-canvas-sunken" />
          )
        ) : (
          <div
            ref={scrollRef}
            className={`h-full w-full overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
              isScrollable
                ? "overflow-x-auto touch-pan-x"
                : "overflow-x-hidden"
            } ${
              pointerMode === "pan"
                ? "cursor-grabbing"
                : pointerMode === "scrub"
                  ? "cursor-crosshair"
                  : isScrollable
                    ? "cursor-grab"
                    : ""
            }`}
            style={{
              touchAction:
                pointerMode === "scrub" ? "none" : isScrollable ? "pan-x" : "none",
            }}
            onScroll={handleScroll}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endInteraction}
            onPointerCancel={endInteraction}
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
              {scrub ? <ChartScrubDateTooltip scrub={scrub} /> : null}

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
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-[transform,box-shadow,background-color] duration-200 ${
                isActive
                  ? "bg-primary-soft text-primary ring-1 ring-primary/40"
                  : "text-ink-secondary hover:bg-canvas-sunken hover:text-ink"
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
