"use client";

import { SegmentedCoverageTrack } from "@/components/planner/SegmentedCoverageTrack";
import { SproutVessel } from "@/components/illustrations/SproutVessel";
import { stageForFreedomTiers, tierMarkerLayouts } from "@/lib/life-plan-display";
import type { LifePlanDerived } from "@/lib/life-plan";
import type { SerializedMilestoneEvent } from "@/lib/life-plan-types";

type CoverageMapProps = {
  derived: LifePlanDerived;
  milestoneEvents: SerializedMilestoneEvent[];
  swr: number;
  partTimeIncome?: number;
  /** When true, skip outer section chrome (nested in Planner). */
  embedded?: boolean;
};

export function CoverageMap({
  derived,
  milestoneEvents,
  swr,
  partTimeIncome = 0,
  embedded = false,
}: CoverageMapProps) {
  const vesselStage = stageForFreedomTiers(derived.tiers);
  const tiersClustered = tierMarkerLayouts({
    essentialAnnualCost: derived.essentialAnnualCost,
    annualLifeCost: derived.annualLifeCost,
    partTimeIncome,
  }).some((m) => m.clustered);

  return (
    <section className={embedded ? "mt-6 border-t border-hairline pt-6" : "mt-8 border-t border-hairline pt-8"}>
      <div className="flex items-start gap-4 lg:gap-6">
        <SproutVessel stage={vesselStage} className="h-14 w-14 shrink-0 lg:h-16 lg:w-16" />
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
            What&apos;s taken care of
          </p>
          <p className="mt-1 font-display text-[1.35rem] leading-tight text-ink">
            {derived.securedCategoryCount > 0
              ? `${derived.securedCategoryCount} of ${derived.categoryCoverage.length} secured`
              : "Your coverage track"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Life costs on the track — freedom milestones below. Terracotta ticks
            mark where each lands{tiersClustered ? " (spread when close together)" : ""}.
          </p>
        </div>
      </div>

      <SegmentedCoverageTrack
        categories={derived.categoryCoverage}
        milestoneEvents={milestoneEvents}
        tiers={derived.tiers}
        swr={swr}
        essentialAnnualCost={derived.essentialAnnualCost}
        annualLifeCost={derived.annualLifeCost}
        partTimeIncome={partTimeIncome}
      />
    </section>
  );
}
