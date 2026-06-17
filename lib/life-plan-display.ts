import type {
  CoverageHeadroom,
  FreedomTierId,
  ProjectionBand,
  RunwayLevers,
  TierStatusRow,
} from "@/lib/life-plan";
import type { SproutStage } from "@/components/illustrations/SproutVessel";

/** SproutVessel stage from freedom tiers reached (M2). */
export function stageForFreedomTiers(tiers: TierStatusRow[]): SproutStage {
  if (tiers.some((t) => t.tier === "full" && t.met)) return 3;
  if (
    tiers.some((t) => t.tier === "barista" && t.met) ||
    tiers.some((t) => t.tier === "coast" && t.met)
  ) {
    return 2;
  }
  if (tiers.some((t) => t.tier === "lean" && t.met)) return 1;
  return 0;
}

const TIER_INTRO: Record<
  FreedomTierId,
  { approaching: string; secured: string }
> = {
  lean: {
    approaching:
      "You're getting close to something real — the point where your essentials are covered for good. People call that lean financial independence.",
    secured:
      "Your essentials are covered for good. Whatever else happens, the core of your life is safe now.",
  },
  coast: {
    approaching:
      "A quieter milestone is coming into view — even if you never added another dollar, this could grow into your full life by your target year.",
    secured:
      "Even if you never added another dollar, this could grow into your full life by your target year — assuming markets behave roughly as they have. Coasting is on the table.",
  },
  barista: {
    approaching:
      "Light part-time work could bridge the rest — that's what people mean by barista financial independence.",
    secured:
      "Light part-time income would bridge the gap to your full life. Work becomes optional in practice.",
  },
  full: {
    approaching:
      "You're approaching the point where the whole life is covered — work becomes optional.",
    secured:
      "The whole life is covered. Work is optional.",
  },
};

export function tierApproachingCopy(tier: TierStatusRow): string | null {
  if (tier.met || tier.progress < 0.65) return null;
  return TIER_INTRO[tier.tier].approaching;
}

export function tierSecuredCopy(tier: TierStatusRow): string | null {
  if (!tier.met) return null;
  return TIER_INTRO[tier.tier].secured;
}

export function categorySecuredCopy(label: string): string {
  return `${label} is handled — permanently part of what your savings can carry.`;
}

/** Human runway figure — breathing room, never a countdown tone. */
export function formatRunwayHeadline(
  months: number | null,
  indefinite: boolean,
): string {
  if (indefinite) return "Open-ended";
  const floored = Math.max(0, Math.floor(months ?? 0));
  if (floored === 0) return "Under a month";
  if (floored === 1) return "1 month";
  return `${floored} months`;
}

export function formatRunwayUnit(
  months: number | null,
  indefinite: boolean,
): { value: string; unit: string } {
  if (indefinite) return { value: "∞", unit: "breathing room" };
  const floored = Math.max(0, Math.floor(months ?? 0));
  if (floored === 0) return { value: "<1", unit: "month" };
  return { value: String(floored), unit: floored === 1 ? "month" : "months" };
}

/** Gentle reassurance copy for the runway hero (M3 voice). */
export function runwayReassuranceCopy(
  months: number | null,
  indefinite: boolean,
  accessibleAssets: number,
): string {
  if (accessibleAssets <= 0) {
    return "The floor you're building from — every dollar of buffer adds noticeably to it.";
  }
  if (indefinite) {
    return "Your essentials are covered — the clock stops. That's real breathing room.";
  }
  const floored = Math.max(0, Math.floor(months ?? 0));
  if (floored < 3) {
    return "Right now that's a real floor — and the one we'll grow first. Even a little buffer adds noticeably to it.";
  }
  if (floored < 12) {
    return `If everything stopped today, you'd float for ${floored} months. That's breathing room — not nothing.`;
  }
  return `If everything stopped today, you'd be okay for ${floored} months. That's more than a year of breathing room — not nothing.`;
}

/** Agency copy when levers change the figure (baseline → current). */
export function runwayAgencyCopy(input: {
  baselineMonths: number | null;
  baselineIndefinite: boolean;
  currentMonths: number | null;
  currentIndefinite: boolean;
  levers: RunwayLevers;
}): string | null {
  const { levers, baselineIndefinite, currentIndefinite } = input;
  if (!levers.cutToEssentials && !levers.partTime) return null;

  if (currentIndefinite) {
    return "With these levers, the clock stops entirely — work becomes optional in practice.";
  }

  const current = Math.max(0, Math.floor(input.currentMonths ?? 0));
  const parts: string[] = [];

  if (levers.cutToEssentials) {
    parts.push(`trim to essentials (${current} months)`);
  }
  if (levers.partTime) {
    parts.push("add a little part-time");
  }

  if (parts.length === 0) return null;

  if (baselineIndefinite) {
    return `You're already open-ended at baseline — these levers add even more margin.`;
  }

  const baseline = Math.max(0, Math.floor(input.baselineMonths ?? 0));
  if (current > baseline) {
    return `From ${baseline} months at baseline — ${parts.join(" and ")} stretches that cushion.`;
  }

  return `With ${parts.join(" and ")}, you'd have about ${current} months.`;
}

/** Meter fill 0–1 for a soft visual (caps at 24 months for display). */
export function runwayMeterFill(
  months: number | null,
  indefinite: boolean,
  capMonths = 24,
): number {
  if (indefinite) return 1;
  const floored = Math.max(0, months ?? 0);
  if (capMonths <= 0) return 0;
  return Math.min(1, floored / capMonths);
}

/* ─── M4: weather, not verdict ──────────────────────────────────── */

/** Round a drop fraction to a friendly whole-percent string. */
export function formatDropPct(dropPct: number): string {
  return `${Math.round(Math.max(0, dropPct) * 100)}%`;
}

/** Headroom line for a single secured row (coverage map tooltip). */
export function rowHeadroomCopy(
  label: string,
  dropPct: number | null | undefined,
): string | null {
  if (dropPct == null) return null;
  if (dropPct < 0.02) {
    return `${label} just cleared — it won't un-secure on an ordinary dip.`;
  }
  return `Markets would need to fall about ${formatDropPct(dropPct)} before ${label} would wobble.`;
}

/** Summary headroom reassurance for the whole secured floor. */
export function coverageHeadroomCopy(
  headroom: CoverageHeadroom | null,
): string | null {
  if (!headroom || headroom.securedCount === 0) return null;
  if (headroom.bindingDropPct < 0.02) {
    return "Your secured floor just cleared — and it won't flip back on an ordinary dip.";
  }
  return `Your secured floor has room: markets would need to fall about ${formatDropPct(
    headroom.bindingDropPct,
  )} before any of it would wobble — and it won't un-secure on ordinary swings.`;
}

/** Honest band copy for the freedom timeline (Coast projection). */
export function projectionBandCopy(band: ProjectionBand | null): string | null {
  if (!band) return null;
  if (band.alreadyMet) {
    return "You're already there — this life is fully funded.";
  }
  if (band.beyondHorizon || band.expectedYear == null) {
    return "On a rougher path this needs more than time alone — a little more added moves it within reach. Not a closed door.";
  }
  if (
    band.pessimisticYear == null ||
    band.pessimisticYear === band.expectedYear
  ) {
    return `On a steady path, you'd arrive around ${band.expectedYear}.`;
  }
  return `On a steady path you'd arrive around ${band.expectedYear}; through rougher weather, closer to ${band.pessimisticYear}. Either way, you're moving toward it.`;
}

/** Short range label, e.g. "2041–2045" or "~2041". */
export function projectionBandLabel(band: ProjectionBand | null): string | null {
  if (!band) return null;
  if (band.alreadyMet) return "Now";
  if (band.beyondHorizon || band.expectedYear == null) return "Beyond the horizon";
  if (
    band.pessimisticYear == null ||
    band.pessimisticYear === band.expectedYear
  ) {
    return `~${band.expectedYear}`;
  }
  return `${band.expectedYear}–${band.pessimisticYear}`;
}

/**
 * Down-market composition: pairs an honest dip with what held + the levers.
 * `changePct` is the net-worth change over the recent window (negative = down).
 */
export function downMarketReassuranceCopy(input: {
  changePct: number;
  securedCount: number;
  headroom: CoverageHeadroom | null;
  runwayMonths: number | null;
  runwayIndefinite: boolean;
}): string | null {
  if (input.changePct >= -0.005) return null;

  const parts: string[] = ["This is weather, not a verdict."];

  if (input.securedCount > 0) {
    parts.push(
      `Your secured floor held — that doesn't move with the market${
        input.headroom && input.headroom.bindingDropPct >= 0.02
          ? `, and it has about ${formatDropPct(input.headroom.bindingDropPct)} of room before it would wobble`
          : ""
      }.`,
    );
  }

  if (!input.runwayIndefinite && input.runwayMonths != null) {
    const months = Math.max(0, Math.floor(input.runwayMonths));
    parts.push(
      `Runway flexes with markets — it's about ${months} ${
        months === 1 ? "month" : "months"
      } today, and the levers below are yours.`,
    );
  } else if (input.runwayIndefinite) {
    parts.push("Your breathing room is still open-ended.");
  }

  return parts.join(" ");
}

export function formatCoverageDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export type TierMarkerLayout = {
  tier: FreedomTierId;
  /** True threshold on the 0–1 life-cost track. */
  position: number;
  /** Collision-safe placement for bar ticks. */
  displayPosition: number;
  /** True when tier thresholds sit too close to spread ticks evenly. */
  clustered: boolean;
};

const TIER_ORDER: FreedomTierId[] = ["lean", "coast", "barista", "full"];

const EQUAL_DISPLAY_SLOTS = [0.12, 0.38, 0.64, 0.88];

/** Minimum horizontal gap between tier label centers (0–1 scale). */
const MIN_LABEL_GAP = 0.14;

function spreadDisplayPositions(
  layouts: Array<{ tier: FreedomTierId; position: number }>,
): TierMarkerLayout[] {
  const sorted = [...layouts].sort((a, b) => a.position - b.position);
  const spread =
    sorted[sorted.length - 1].position - sorted[0].position;
  const clustered = spread < 0.22;

  if (clustered) {
    return sorted.map((item, index) => ({
      tier: item.tier,
      position: item.position,
      displayPosition: EQUAL_DISPLAY_SLOTS[index] ?? item.position,
      clustered: true,
    }));
  }

  let cursor = -MIN_LABEL_GAP;
  return sorted.map((item) => {
    const displayPosition = Math.min(
      0.96,
      Math.max(item.position, cursor + MIN_LABEL_GAP),
    );
    cursor = displayPosition;
    return {
      tier: item.tier,
      position: item.position,
      displayPosition,
      clustered: false,
    };
  });
}

/** Place freedom tier pins on the shared 0–1 coverage track. */
export function tierMarkerLayouts(input: {
  essentialAnnualCost: number;
  annualLifeCost: number;
  partTimeIncome: number;
}): TierMarkerLayout[] {
  const { essentialAnnualCost, annualLifeCost, partTimeIncome } = input;

  if (annualLifeCost <= 0) {
    return TIER_ORDER.map((tier, index) => ({
      tier,
      position: EQUAL_DISPLAY_SLOTS[index],
      displayPosition: EQUAL_DISPLAY_SLOTS[index],
      clustered: false,
    }));
  }

  const lean = Math.min(0.96, essentialAnnualCost / annualLifeCost);
  const baristaRaw = (annualLifeCost - partTimeIncome) / annualLifeCost;
  const barista = Math.min(
    0.97,
    Math.max(lean + 0.06, baristaRaw),
  );
  const coast = Math.max(
    lean + 0.04,
    Math.min(barista - 0.06, lean + (1 - lean) * 0.42),
  );

  const raw = [
    { tier: "lean" as const, position: lean },
    { tier: "coast" as const, position: coast },
    { tier: "barista" as const, position: barista },
    { tier: "full" as const, position: 1 },
  ];

  return spreadDisplayPositions(raw);
}
