"use client";

import { BudgetIcon } from "@/components/budget/BudgetIcon";
import { SegmentTooltip } from "@/components/planner/SegmentTooltip";
import {
  categorySecuredCopy,
  formatCoverageDate,
  tierApproachingCopy,
  tierMarkerLayouts,
  tierSecuredCopy,
} from "@/lib/life-plan-display";
import { iconForLifeCategory, TIER_ICONS } from "@/lib/life-plan-icons";
import type { CategoryCoverageRow, TierStatusRow } from "@/lib/life-plan";
import type { SerializedMilestoneEvent } from "@/lib/life-plan-types";
import { formatCurrency } from "@/lib/format";

type SegmentedCoverageTrackProps = {
  categories: CategoryCoverageRow[];
  milestoneEvents: SerializedMilestoneEvent[];
  tiers?: TierStatusRow[];
  swr?: number;
  essentialAnnualCost?: number;
  annualLifeCost?: number;
  partTimeIncome?: number;
  compact?: boolean;
};

type SegmentLayout = {
  row: CategoryCoverageRow;
  index: number;
  weight: number;
  fillPct: number;
  isNext: boolean;
};

const MIN_SEGMENT_REM = 4.75;

function buildSegmentLayouts(
  categories: CategoryCoverageRow[],
  totalWeight: number,
  nextIndex: number,
): SegmentLayout[] {
  return categories.map((row, index) => {
    const weight = Math.max(row.annualAmount, 1) / totalWeight;
    let fillPct = 0;
    if (row.secured) fillPct = 100;
    else if (index === nextIndex) {
      fillPct = Math.max(4, Math.round(row.progressToSecure * 100));
    }

    return {
      row,
      index,
      weight,
      fillPct,
      isNext: index === nextIndex,
    };
  });
}

function tierTooltipContent(
  tier: TierStatusRow,
  swr: number,
  milestone?: SerializedMilestoneEvent,
) {
  const pct = Math.round(tier.progress * 100);
  const approaching = tierApproachingCopy(tier);
  const secured = tierSecuredCopy(tier);

  if (tier.met) {
    return (
      <>
        <p className="font-medium text-ink">{tier.label}</p>
        <p className="mt-1">{secured}</p>
        {milestone ? (
          <p className="mt-1.5 text-ink-faint">
            Reached {formatCoverageDate(milestone.securedAt)}
          </p>
        ) : null}
        {tier.isProjection ? (
          <p className="mt-1.5 text-ink-faint">
            A projection — assuming markets behave roughly as they have.
          </p>
        ) : null}
      </>
    );
  }

  if (approaching) {
    return (
      <>
        <p className="font-medium text-ink">{tier.label}</p>
        <p className="mt-1">{approaching}</p>
        <p className="mt-1.5 tabular-nums text-sage-deep">
          About {formatCurrency(tier.targetAmount)} · {pct}% there
        </p>
      </>
    );
  }

  return (
    <>
      <p className="font-medium text-ink">{tier.label}</p>
      <p className="mt-1">{tier.plainWords}</p>
      <p className="mt-1.5 tabular-nums text-ink-faint">
        About {formatCurrency(tier.targetAmount)} · {(swr * 100).toFixed(1)}%
        withdrawal
      </p>
    </>
  );
}

function categoryTooltip(
  row: CategoryCoverageRow,
  isNext: boolean,
  milestone?: SerializedMilestoneEvent,
) {
  if (row.secured) {
    return (
      <>
        <p className="font-medium text-ink">{row.label}</p>
        <p className="mt-1">{categorySecuredCopy(row.label)}</p>
        {milestone ? (
          <p className="mt-1.5 text-ink-faint">
            Secured {formatCoverageDate(milestone.securedAt)}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <p className="font-medium text-ink">{row.label}</p>
      <p className="mt-1">
        {formatCurrency(row.annualAmount)}/yr
        {row.isEssential ? " · Essential" : ""}
      </p>
      {isNext ? (
        <p className="mt-1 text-sage-deep">
          {Math.round(row.progressToSecure * 100)}% toward securing this
        </p>
      ) : (
        <p className="mt-1 text-ink-faint">Waiting in line</p>
      )}
    </>
  );
}

function TierLegendCell({
  tier,
  swr,
  milestone,
  compact,
}: {
  tier: TierStatusRow;
  swr: number;
  milestone?: SerializedMilestoneEvent;
  compact?: boolean;
}) {
  const pct = Math.round(tier.progress * 100);
  const fill = tier.met ? 100 : pct;

  return (
    <div
          className={`flex min-w-0 flex-col rounded-[14px] border border-hairline bg-paper-2 px-3 py-3 ${
        tier.met ? "border-sage/30 bg-sage-wash/40" : ""
      }`}
    >
      <SegmentTooltip
        label={`${tier.label} milestone`}
        content={tierTooltipContent(tier, swr, milestone)}
      >
        <div className="flex min-w-0 items-center gap-2 text-left">
          <BudgetIcon
            name={TIER_ICONS[tier.tier]}
            className={`h-4 w-4 shrink-0 ${tier.met ? "text-sage-deep" : "text-ink-soft"}`}
            strokeWidth={tier.met ? 2 : 1.5}
          />
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-xs font-semibold ${
                tier.met ? "text-sage-deep" : "text-ink"
              }`}
            >
              {tier.label}
            </p>
            {!compact ? (
              <p className="text-[10px] text-ink-faint">
                {tier.met ? "Reached" : `${pct}% there`}
              </p>
            ) : null}
          </div>
        </div>
      </SegmentTooltip>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ds-track)]"
        role="progressbar"
        aria-valuenow={fill}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${tier.label} progress`}
      >
        <div
          className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 ${
            tier.met ? "bg-sage" : "bg-sage/70"
          }`}
          style={{ width: `${Math.max(fill, tier.met ? 100 : 2)}%` }}
        />
      </div>
      {milestone && !compact ? (
        <p className="mt-1.5 text-[10px] tabular-nums text-ink-faint">
          {formatCoverageDate(milestone.securedAt)}
        </p>
      ) : null}
    </div>
  );
}

export function SegmentedCoverageTrack({
  categories,
  milestoneEvents,
  tiers,
  swr = 0.04,
  essentialAnnualCost = 0,
  annualLifeCost = 0,
  partTimeIncome = 0,
  compact = false,
}: SegmentedCoverageTrackProps) {
  if (categories.length === 0) {
    return (
      <p className="mt-4 text-sm text-ink-soft">
        Add life costs in the editor to see your coverage track.
      </p>
    );
  }

  const totalWeight = categories.reduce(
    (sum, c) => sum + Math.max(c.annualAmount, 1),
    0,
  );
  const nextIndex = categories.findIndex((c) => !c.secured);
  const segments = buildSegmentLayouts(categories, totalWeight, nextIndex);

  const categoryMilestones = new Map(
    milestoneEvents
      .filter((e) => e.type === "category")
      .map((e) => [e.ref, e]),
  );

  const tierMilestones = new Map(
    milestoneEvents
      .filter((e) => e.type === "tier")
      .map((e) => [e.ref, e]),
  );

  const markerLayouts =
    tiers && tiers.length > 0
      ? tierMarkerLayouts({
          essentialAnnualCost,
          annualLifeCost,
          partTimeIncome,
        })
      : [];

  const tierById = new Map(tiers?.map((t) => [t.tier, t]) ?? []);
  const tiersClustered = markerLayouts.some((m) => m.clustered);

  const minInnerWidth = `${Math.max(categories.length * MIN_SEGMENT_REM, 22)}rem`;
  const barHeight = compact ? "h-3.5 sm:h-4" : "h-5 sm:h-6";
  const gapClass = compact ? "gap-1" : "gap-1.5 sm:gap-2";

  return (
    <div className={compact ? "mt-3" : "mt-6 space-y-5 sm:space-y-6"}>
      {/* Life-cost segments */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
          Life costs
        </p>
        <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1">
          <div className="w-full" style={{ minWidth: minInnerWidth }}>
            <div className="relative">
              <div
                className={`flex ${gapClass} ${barHeight}`}
                role="group"
                aria-label="Life cost coverage"
              >
                {segments.map(({ row, index, weight, fillPct }) => (
                  <div
                    key={row.id ?? `${row.label}-${index}`}
                    className="relative min-w-[4.5rem] flex-1 overflow-hidden rounded-lg border border-hairline bg-paper-2"
                    style={{ flexGrow: weight, flexBasis: 0 }}
                  >
                    <div
                      className="h-full bg-sage motion-safe:transition-[width] motion-safe:duration-700"
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                ))}
              </div>

              {markerLayouts.map(({ tier, position, displayPosition, clustered }) => {
                const tierRow = tierById.get(tier);
                if (!tierRow) return null;
                const milestone = tierMilestones.get(tier);
                const thresholdPct = Math.round(position * 100);

                return (
                  <div
                    key={`tick-${tier}`}
                    className="absolute top-0 z-[2] h-full w-4 -translate-x-1/2"
                    style={{ left: `${displayPosition * 100}%` }}
                  >
                    <div
                      className={`pointer-events-none absolute left-1/2 w-1 -translate-x-1/2 rounded-full bg-terra/60 ${barHeight}`}
                      aria-hidden
                    />
                    <SegmentTooltip
                      label={`${tierRow.label} milestone`}
                      className="absolute inset-0"
                      triggerClassName="h-full w-full opacity-0 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-terra"
                      content={
                        <>
                          {clustered ? (
                            <p className="mb-1.5 text-ink-faint">
                              ~{thresholdPct}% of annual life costs — tick
                              spread for readability.
                            </p>
                          ) : null}
                          {tierTooltipContent(tierRow, swr, milestone)}
                        </>
                      }
                    >
                      <span className="sr-only">{tierRow.label}</span>
                    </SegmentTooltip>
                  </div>
                );
              })}
            </div>

            <div className={`mt-3 flex ${gapClass}`}>
              {segments.map(({ row, index, weight, isNext }) => {
                const milestone = row.id
                  ? categoryMilestones.get(row.id)
                  : undefined;
                const iconName = iconForLifeCategory(row.label);

                return (
                  <div
                    key={`icon-${row.id ?? row.label}-${index}`}
                    className="flex min-w-[4.5rem] flex-1 flex-col items-center px-0.5 text-center sm:px-1"
                    style={{ flexGrow: weight, flexBasis: 0 }}
                  >
                    <SegmentTooltip
                      label={row.label}
                      content={categoryTooltip(row, isNext, milestone)}
                    >
                      <span
                        className={`inline-flex rounded-full p-1.5 ${
                          row.secured
                            ? "bg-sage-wash text-sage-deep"
                            : isNext
                              ? "bg-sage-wash/60 text-sage"
                              : "text-ink-faint"
                        }`}
                      >
                        <BudgetIcon
                          name={iconName}
                          className={
                            compact
                              ? "h-3.5 w-3.5 sm:h-4 sm:w-4"
                              : "h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]"
                          }
                          strokeWidth={row.secured ? 2 : 1.5}
                        />
                      </span>
                    </SegmentTooltip>
                    <p
                      className={`mt-1.5 w-full leading-tight text-ink-soft ${
                        compact
                          ? "line-clamp-1 text-[9px] sm:text-[10px]"
                          : "line-clamp-2 text-[10px] sm:text-xs"
                      }`}
                    >
                      {row.label}
                    </p>
                    {milestone && !compact ? (
                      <span className="mt-1 text-[10px] tabular-nums text-ink-faint">
                        {formatCoverageDate(milestone.securedAt)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Freedom milestones — grid avoids lean/full collision */}
      {tiers && tiers.length > 0 ? (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Freedom milestones
          </p>
          {tiersClustered && !compact ? (
            <p className="mb-2 text-xs text-ink-soft">
              Essentials are most of this life — Lean and Full sit close on the
              cost track; details below.
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-4 lg:gap-3">
            {tiers.map((tier) => (
              <TierLegendCell
                key={tier.tier}
                tier={tier}
                swr={swr}
                milestone={tierMilestones.get(tier.tier)}
                compact={compact}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
