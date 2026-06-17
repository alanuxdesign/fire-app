import type { FreedomTierId, TierStatusRow } from "@/lib/life-plan";
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
