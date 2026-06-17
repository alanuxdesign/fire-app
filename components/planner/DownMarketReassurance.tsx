"use client";

import { computeRunwayWithLevers } from "@/lib/life-plan";
import { downMarketReassuranceCopy } from "@/lib/life-plan-display";
import type { LifePlanDerived } from "@/lib/life-plan";
import { GHOST_BUTTON } from "@/components/ui/cardStyles";
import { CloudRain } from "lucide-react";
import Link from "next/link";

type DownMarketReassuranceProps = {
  derived: LifePlanDerived;
  accessibleAssets: number;
  totalAssets: number;
  swr: number;
  partTimeIncomeAnnual: number;
  /** Net-worth change over the recent window, in PERCENT units (e.g. -6.2). */
  changePercent: number;
  /** e.g. "since last month" */
  changeWindowLabel?: string;
};

export function DownMarketReassurance({
  derived,
  accessibleAssets,
  totalAssets,
  swr,
  partTimeIncomeAnnual,
  changePercent,
  changeWindowLabel,
}: DownMarketReassuranceProps) {
  const baseline = computeRunwayWithLevers({
    accessibleAssets,
    totalAssets,
    swr,
    fullMonthlySpend: derived.fullMonthlySpend,
    essentialMonthlySpend: derived.essentialMonthlyBurn,
    partTimeIncomeAnnual,
    levers: { cutToEssentials: false, partTime: false },
  });

  const copy = downMarketReassuranceCopy({
    changePct: changePercent / 100,
    securedCount: derived.securedCategoryCount,
    headroom: derived.coverageHeadroom,
    runwayMonths: baseline.months,
    runwayIndefinite: baseline.indefinite,
  });

  if (!copy) return null;

  return (
    <section
      className="border-t border-hairline pt-8"
      aria-label="Down-market reassurance"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-sage-wash text-sage-deep">
          <CloudRain className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
            Weather, not a verdict
            {changeWindowLabel ? (
              <span className="ml-2 font-medium normal-case tracking-normal text-ink-faint">
                · {changeWindowLabel}
              </span>
            ) : null}
          </p>
          <p className="mt-2 font-display text-[1.15rem] italic leading-[1.42] text-ink">
            {copy}
          </p>
          <Link
            href="/planner#runway"
            className={`mt-4 inline-flex ${GHOST_BUTTON}`}
          >
            See what you control
          </Link>
        </div>
      </div>
    </section>
  );
}
