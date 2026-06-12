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
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
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
                    ? "bg-primary text-on-primary shadow-soft"
                    : "bg-canvas text-ink-secondary hover:bg-canvas-sunken"
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
            className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted"
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
            className="max-w-[8.5rem] truncate rounded-xl border-0 bg-canvas py-2 pl-3 pr-8 text-sm font-semibold text-ink shadow-inner ring-1 ring-hairline outline-none focus:ring-2 focus:ring-primary"
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
