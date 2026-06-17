"use client";

import { computeRunwayWithLevers } from "@/lib/life-plan";
import { formatRunwayHeadline, runwayMeterFill } from "@/lib/life-plan-display";
import type { LifePlanDerived } from "@/lib/life-plan";
import { GHOST_BUTTON } from "@/components/ui/cardStyles";
import Link from "next/link";

const MEANINGFUL_RUNWAY_MONTHS = 12;

type RunwayTeaserProps = {
  derived: LifePlanDerived;
  accessibleAssets: number;
  totalAssets: number;
  swr: number;
  partTimeIncomeAnnual: number;
};

export function RunwayTeaser({
  derived,
  accessibleAssets,
  totalAssets,
  swr,
  partTimeIncomeAnnual,
}: RunwayTeaserProps) {
  const baseline = computeRunwayWithLevers({
    accessibleAssets,
    totalAssets,
    swr,
    fullMonthlySpend: derived.fullMonthlySpend,
    essentialMonthlySpend: derived.essentialMonthlyBurn,
    partTimeIncomeAnnual,
    levers: { cutToEssentials: false, partTime: false },
  });

  const essentials = computeRunwayWithLevers({
    accessibleAssets,
    totalAssets,
    swr,
    fullMonthlySpend: derived.fullMonthlySpend,
    essentialMonthlySpend: derived.essentialMonthlyBurn,
    partTimeIncomeAnnual,
    levers: { cutToEssentials: true, partTime: false },
  });

  const floored = Math.max(0, Math.floor(baseline.months ?? 0));
  const showProactive =
    !baseline.indefinite && floored >= MEANINGFUL_RUNWAY_MONTHS;
  const headline = formatRunwayHeadline(baseline.months, baseline.indefinite);
  const fill = runwayMeterFill(baseline.months, baseline.indefinite);

  return (
    <section className="border-t border-hairline pt-8" aria-label="Runway">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
        Runway &amp; adapt
      </p>
      {accessibleAssets <= 0 ? (
        <p className="mt-2 text-[15px] text-ink-soft">
          Link accessible savings to see how long you could float.
        </p>
      ) : baseline.indefinite ? (
        <p className="mt-2 text-[15px] text-ink-soft">
          Essentials are covered — your breathing room is{" "}
          <span className="font-medium text-sage-deep">open-ended</span>.
        </p>
      ) : (
        <p className="mt-2 text-[15px] text-ink-soft">
          If income stopped today, you could float for{" "}
          <span className="font-medium tabular-nums text-sage-deep">
            {headline.toLowerCase()}
          </span>
          {showProactive ? " — more than a year of breathing room." : "."}
          {!essentials.indefinite &&
          Math.floor(essentials.months ?? 0) > floored ? (
            <>
              {" "}
              Trim to essentials and it&apos;s{" "}
              <span className="font-medium tabular-nums text-ink">
                {formatRunwayHeadline(essentials.months, essentials.indefinite).toLowerCase()}
              </span>
              .
            </>
          ) : essentials.indefinite && !baseline.indefinite ? (
            <> Trim to essentials and the clock stops.</>
          ) : null}
        </p>
      )}

      {accessibleAssets > 0 && !baseline.indefinite ? (
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--ds-track)]"
          role="presentation"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-sage"
            style={{ width: `${Math.max(fill * 100, 4)}%` }}
          />
        </div>
      ) : null}

      <Link
        href="/planner#runway"
        className={`mt-4 inline-flex ${GHOST_BUTTON}`}
      >
        Explore your levers
      </Link>
    </section>
  );
}
