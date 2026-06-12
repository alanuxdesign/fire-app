"use client";

import { PORTFOLIO_FLOATING_CARD } from "@/components/portfolio/portfolioStyles";
import {
  GROUPING_MODES,
  type GroupingMode,
  VIEW_MODES,
  type ViewMode,
} from "@/lib/portfolio-views";

type PortfolioControlsProps = {
  viewMode: ViewMode;
  grouping: GroupingMode;
  onViewModeChange: (mode: ViewMode) => void;
  onGroupingChange: (mode: GroupingMode) => void;
};

export function PortfolioControls({
  viewMode,
  grouping,
  onViewModeChange,
  onGroupingChange,
}: PortfolioControlsProps) {
  return (
    <div className={`${PORTFOLIO_FLOATING_CARD} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
            View
          </span>
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => onViewModeChange(mode.value)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-[transform,box-shadow] duration-200 ${
                  viewMode === mode.value
                    ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30"
                    : "bg-stone-100 text-zinc-600 hover:bg-stone-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          <label
            htmlFor="portfolio-grouping"
            className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400"
          >
            Group by
          </label>
          <select
            id="portfolio-grouping"
            value={grouping}
            title={
              GROUPING_MODES.find((mode) => mode.value === grouping)?.label ??
              grouping
            }
            onChange={(event) =>
              onGroupingChange(event.target.value as GroupingMode)
            }
            className="max-w-[8.5rem] truncate rounded-xl border-0 bg-stone-100 py-2 pl-3 pr-8 text-sm font-semibold text-zinc-800 shadow-inner ring-1 ring-black/[0.04] outline-none focus:ring-2 focus:ring-teal-500 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-white/[0.06]"
          >
            {GROUPING_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
