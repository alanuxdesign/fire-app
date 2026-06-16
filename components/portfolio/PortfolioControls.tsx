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
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
          View
        </span>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => onViewModeChange(mode.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === mode.value
                  ? "bg-sage-wash text-sage-deep"
                  : "text-ink-soft hover:bg-sage-wash/50"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        <label
          htmlFor="portfolio-grouping"
          className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint"
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
          className="max-w-[8.5rem] truncate rounded-full border border-hairline bg-paper-2 py-2 pl-3 pr-8 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-terra"
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
