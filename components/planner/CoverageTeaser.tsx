"use client";

import { SegmentedCoverageTrack } from "@/components/planner/SegmentedCoverageTrack";
import type { LifePlanDerived } from "@/lib/life-plan";
import type { SerializedMilestoneEvent } from "@/lib/life-plan-types";
import { GHOST_BUTTON } from "@/components/ui/cardStyles";
import Link from "next/link";

type CoverageTeaserProps = {
  derived: LifePlanDerived;
  milestoneEvents?: SerializedMilestoneEvent[];
  swr?: number;
  partTimeIncome?: number;
};

export function CoverageTeaser({
  derived,
  milestoneEvents = [],
  swr = 0.04,
  partTimeIncome = 0,
}: CoverageTeaserProps) {
  if (derived.categoryCoverage.length === 0) return null;

  const secured = derived.securedCategoryCount;
  const total = derived.categoryCoverage.length;
  const next = derived.categoryCoverage.find((c) => !c.secured);

  return (
    <section className="border-t border-hairline pt-8" aria-label="Coverage">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
        What&apos;s taken care of
      </p>
      <p className="mt-2 text-[15px] text-ink-soft">
        {secured > 0 ? (
          <>
            <span className="font-medium tabular-nums text-sage-deep">
              {secured}/{total}
            </span>{" "}
            life costs secured
            {next ? (
              <>
                {" "}
                · next:{" "}
                <span className="font-medium text-ink">{next.label}</span>
              </>
            ) : null}
          </>
        ) : (
          "Essentials fill first — tap a segment for detail."
        )}
      </p>
      <SegmentedCoverageTrack
        categories={derived.categoryCoverage}
        milestoneEvents={milestoneEvents}
        tiers={derived.tiers}
        swr={swr}
        essentialAnnualCost={derived.essentialAnnualCost}
        annualLifeCost={derived.annualLifeCost}
        partTimeIncome={partTimeIncome}
        compact
      />
      <Link href="/planner" className={`mt-4 inline-flex ${GHOST_BUTTON}`}>
        Open coverage map
      </Link>
    </section>
  );
}
