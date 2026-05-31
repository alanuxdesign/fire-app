"use client";

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
    <div className="flex items-center justify-between gap-3 border-b border-stone-200/80 pb-4 dark:border-zinc-800">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          View
        </span>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => onViewModeChange(mode.value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === mode.value
                  ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-white text-slate-600 ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <label
          htmlFor="portfolio-grouping"
          className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400"
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
          className="max-w-[7.5rem] truncate rounded-lg border border-stone-300 bg-white py-1.5 pl-3 pr-7 text-sm font-medium text-slate-800 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {GROUPING_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
