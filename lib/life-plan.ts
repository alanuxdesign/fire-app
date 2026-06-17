export const DEFAULT_SWR = 0.04;
export const DEFAULT_EXPECTED_RETURN = 0.07;
export const DEFAULT_INFLATION_RATE = 0.03;
export const DEFAULT_PART_TIME_INCOME = 12_000;
/** Buffer above cumulative cost before a category is marked secured (M2 hysteresis seed). */
export const COVERAGE_SECURE_BUFFER = 0.05;
/**
 * How far below the expected return the "rougher weather" projection path sits
 * (M4 honest bands). Deterministic, not a probability — a framing device.
 */
export const CONSERVATIVE_RETURN_SPREAD = 0.03;
/** Floor for the conservative return so the band stays meaningful. */
export const CONSERVATIVE_RETURN_FLOOR = 0.01;
/** Horizon cap (years) before a projection is framed as "needs more than time." */
export const PROJECTION_HORIZON_CAP = 50;

export type LifeExpenseCategoryInput = {
  id?: string;
  label: string;
  annualAmount: number;
  isEssential: boolean;
  sortOrder: number;
  /** Links to a Budget bucket when synced or added from recommendations. */
  budgetCategoryId?: string | null;
};

/** Annual life cost inflated to a future year for FIRE horizon display. */
export function computeInflatedAnnualCost(
  annualCost: number,
  inflationRate: number,
  years: number,
): number {
  if (years <= 0) return annualCost;
  return annualCost * (1 + inflationRate) ** years;
}

export function computeFireTargetProjection(input: {
  annualLifeCost: number;
  swr: number;
  inflationRate: number;
  targetYear: number | null;
  currentYear?: number;
}): {
  yearsToTarget: number;
  todayTarget: number;
  futureAnnualCost: number;
  futureTarget: number;
} {
  const currentYear = input.currentYear ?? new Date().getFullYear();
  const yearsToTarget =
    input.targetYear && input.targetYear > currentYear
      ? input.targetYear - currentYear
      : 0;
  const todayTarget = computeTarget(input.annualLifeCost, input.swr);
  const futureAnnualCost = computeInflatedAnnualCost(
    input.annualLifeCost,
    input.inflationRate,
    yearsToTarget,
  );
  const futureTarget = computeTarget(futureAnnualCost, input.swr);
  return {
    yearsToTarget,
    todayTarget,
    futureAnnualCost,
    futureTarget,
  };
}

export type TierAssumptionInput = {
  swr: number;
  expectedReturn: number;
  inflationRate: number;
  targetYear: number | null;
  partTimeIncome: number;
};

export type CategoryCoverageRow = {
  id?: string;
  label: string;
  annualAmount: number;
  isEssential: boolean;
  sortOrder: number;
  cumulativeCost: number;
  secured: boolean;
  progressToSecure: number;
  /**
   * M4 headroom: fraction assets could fall before this secured row would
   * wobble (`1 − cost / passiveIncome`). Null when not yet secured.
   */
  headroomDropPct?: number | null;
};

export type FreedomTierId = "lean" | "coast" | "barista" | "full";

export type TierStatusRow = {
  tier: FreedomTierId;
  label: string;
  targetAmount: number;
  progress: number;
  met: boolean;
  plainWords: string;
  isProjection?: boolean;
  /** M4 headroom for already-secured tiers (drop fraction before wobble). */
  headroomDropPct?: number | null;
  /** M4 honest band — only populated for the Coast/timeline projection. */
  projectionBand?: ProjectionBand | null;
};

/**
 * M4 honest projection band — deterministic low/expected arrival, NOT a
 * confidence interval. Years are absolute calendar years.
 */
export type ProjectionBand = {
  expectedYear: number | null;
  pessimisticYear: number | null;
  /** True when assets already meet the target (band collapses to "now"). */
  alreadyMet: boolean;
  /** True when even the expected path can't reach target within the horizon. */
  beyondHorizon: boolean;
};

/** M4 coverage stability — how much weather the secured floor can absorb. */
export type CoverageHeadroom = {
  /** Smallest drop fraction among secured rows (the binding constraint). */
  bindingDropPct: number;
  /** Label of the binding (most-recently-secured) row. */
  bindingLabel: string;
  /** Count of secured category rows the headroom protects. */
  securedCount: number;
};

export type RunwayScenario = "baseline" | "essentials" | "part_time";

export type RunwayResult = {
  scenario: RunwayScenario;
  label: string;
  months: number | null;
  indefinite: boolean;
  netBurnMonthly: number;
};

export type LifePlanDerived = {
  annualLifeCost: number;
  essentialAnnualCost: number;
  essentialMonthlyBurn: number;
  fullMonthlySpend: number;
  target: number;
  progressPct: number;
  passiveMonthlyIncome: number;
  categoryCoverage: CategoryCoverageRow[];
  securedCategoryCount: number;
  nextCoverageLabel: string | null;
  tiers: TierStatusRow[];
  runway: RunwayResult[];
  /** M4 — how much markets could fall before the secured floor wobbles. */
  coverageHeadroom: CoverageHeadroom | null;
  /** M4 — honest low/expected band for the freedom timeline (Coast). */
  projectionBand: ProjectionBand | null;
};

/** M4 conservative ("rougher weather") return derived from the expected one. */
export function conservativeReturnFrom(expectedReturn: number): number {
  return Math.max(
    CONSERVATIVE_RETURN_FLOOR,
    expectedReturn - CONSERVATIVE_RETURN_SPREAD,
  );
}

/** Years until `assets` compounds to `target` at `rate`, or null if never/capped. */
function yearsToCompoundTarget(
  assets: number,
  target: number,
  rate: number,
  horizonCap = PROJECTION_HORIZON_CAP,
): number | null {
  if (assets <= 0 || target <= 0) return null;
  if (assets >= target) return 0;
  if (rate <= 0) return null;
  const years = Math.log(target / assets) / Math.log(1 + rate);
  if (!Number.isFinite(years) || years > horizonCap) return null;
  return Math.ceil(years);
}

/**
 * M4 honest band: when the user would arrive at `target` on the expected vs.
 * conservative return path. Deterministic framing, not a probability.
 */
export function computeProjectionBand(input: {
  assets: number;
  target: number;
  expectedReturn: number;
  conservativeReturn?: number;
  currentYear?: number;
  horizonCap?: number;
}): ProjectionBand {
  const currentYear = input.currentYear ?? new Date().getFullYear();
  const horizonCap = input.horizonCap ?? PROJECTION_HORIZON_CAP;
  const conservative =
    input.conservativeReturn ?? conservativeReturnFrom(input.expectedReturn);

  if (input.assets > 0 && input.target > 0 && input.assets >= input.target) {
    return {
      expectedYear: currentYear,
      pessimisticYear: currentYear,
      alreadyMet: true,
      beyondHorizon: false,
    };
  }

  const expectedYears = yearsToCompoundTarget(
    input.assets,
    input.target,
    input.expectedReturn,
    horizonCap,
  );
  const pessimisticYears = yearsToCompoundTarget(
    input.assets,
    input.target,
    conservative,
    horizonCap,
  );

  return {
    expectedYear: expectedYears == null ? null : currentYear + expectedYears,
    pessimisticYear:
      pessimisticYears == null ? null : currentYear + pessimisticYears,
    alreadyMet: false,
    beyondHorizon: expectedYears == null,
  };
}

/**
 * M4 binding coverage headroom: the smallest drop fraction among secured
 * category rows (the most-recently-secured row is the constraint).
 */
export function computeCoverageHeadroom(
  rows: CategoryCoverageRow[],
): CoverageHeadroom | null {
  const secured = rows.filter((r) => r.secured);
  if (secured.length === 0) return null;

  let binding = secured[0];
  let bindingDrop = binding.headroomDropPct ?? 0;
  for (const row of secured) {
    const drop = row.headroomDropPct ?? 0;
    if (drop <= bindingDrop) {
      bindingDrop = drop;
      binding = row;
    }
  }

  return {
    bindingDropPct: Math.max(0, bindingDrop),
    bindingLabel: binding.label,
    securedCount: secured.length,
  };
}

function sortCategoriesCheapestFirst(
  categories: LifeExpenseCategoryInput[],
): LifeExpenseCategoryInput[] {
  return [...categories].sort((a, b) => {
    if (a.annualAmount !== b.annualAmount) {
      return a.annualAmount - b.annualAmount;
    }
    return a.sortOrder - b.sortOrder;
  });
}

export function computeAnnualLifeCost(categories: LifeExpenseCategoryInput[]): number {
  return categories.reduce((sum, c) => sum + Math.max(0, c.annualAmount), 0);
}

export function computeEssentialAnnualCost(
  categories: LifeExpenseCategoryInput[],
): number {
  return categories
    .filter((c) => c.isEssential)
    .reduce((sum, c) => sum + Math.max(0, c.annualAmount), 0);
}

export function computeTarget(annualLifeCost: number, swr: number): number {
  if (annualLifeCost <= 0 || swr <= 0) return 0;
  return annualLifeCost / swr;
}

export function computeProgressPct(assets: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(1, Math.max(0, assets / target));
}

export function computePassiveAnnualIncome(assets: number, swr: number): number {
  return Math.max(0, assets) * swr;
}

export function computePassiveMonthlyIncome(assets: number, swr: number): number {
  return computePassiveAnnualIncome(assets, swr) / 12;
}

export function computeCategoryCoverage(
  categories: LifeExpenseCategoryInput[],
  assets: number,
  swr: number,
  options?: {
    bufferPct?: number;
    previouslySecuredIds?: Set<string>;
  },
): CategoryCoverageRow[] {
  const bufferPct = options?.bufferPct ?? COVERAGE_SECURE_BUFFER;
  const previouslySecured = options?.previouslySecuredIds ?? new Set<string>();
  const passiveAnnual = computePassiveAnnualIncome(assets, swr);
  const sorted = sortCategoriesCheapestFirst(categories);

  let cumulative = 0;
  return sorted.map((category) => {
    cumulative += Math.max(0, category.annualAmount);
    const threshold = cumulative * (1 + bufferPct);
    const wouldSecure = passiveAnnual >= threshold;
    const secured =
      category.id && previouslySecured.has(category.id)
        ? passiveAnnual >= cumulative
        : wouldSecure;
    const progressToSecure =
      threshold <= 0 ? 1 : Math.min(1, passiveAnnual / threshold);

    const headroomDropPct =
      secured && passiveAnnual > 0
        ? Math.max(0, 1 - cumulative / passiveAnnual)
        : null;

    return {
      id: category.id,
      label: category.label,
      annualAmount: category.annualAmount,
      isEssential: category.isEssential,
      sortOrder: category.sortOrder,
      cumulativeCost: cumulative,
      secured,
      progressToSecure,
      headroomDropPct,
    };
  });
}

export function computeTierStatuses(input: {
  assets: number;
  annualLifeCost: number;
  essentialAnnualCost: number;
  assumptions: TierAssumptionInput;
  currentYear?: number;
}): TierStatusRow[] {
  const {
    assets,
    annualLifeCost,
    essentialAnnualCost,
    assumptions,
    currentYear = new Date().getFullYear(),
  } = input;
  const { swr, expectedReturn, targetYear, partTimeIncome } = assumptions;
  const passiveAnnual = computePassiveAnnualIncome(assets, swr);
  const fullTarget = computeTarget(annualLifeCost, swr);
  const leanTarget = computeTarget(essentialAnnualCost, swr);

  const yearsToTarget =
    targetYear && targetYear > currentYear ? targetYear - currentYear : 25;

  const coastMet =
    fullTarget > 0 &&
    assets * (1 + expectedReturn) ** yearsToTarget >= fullTarget;

  const baristaMet =
    annualLifeCost > 0 && passiveAnnual + partTimeIncome >= annualLifeCost;

  const leanMet = essentialAnnualCost > 0 && passiveAnnual >= essentialAnnualCost;
  const fullMet = annualLifeCost > 0 && passiveAnnual >= annualLifeCost;

  const headroomFor = (cost: number): number | null =>
    passiveAnnual > 0 ? Math.max(0, 1 - cost / passiveAnnual) : null;

  const coastBand = computeProjectionBand({
    assets,
    target: fullTarget,
    expectedReturn,
    currentYear,
  });

  return [
    {
      tier: "lean",
      label: "Lean",
      targetAmount: leanTarget,
      progress: leanTarget > 0 ? Math.min(1, assets / leanTarget) : 0,
      met: leanMet,
      plainWords: "Your essentials are covered for good",
      headroomDropPct: leanMet ? headroomFor(essentialAnnualCost) : null,
    },
    {
      tier: "coast",
      label: "Coast",
      targetAmount: fullTarget,
      progress: fullTarget > 0 ? Math.min(1, assets / fullTarget) : 0,
      met: coastMet,
      plainWords: "Stop adding and still arrive at your full life",
      isProjection: true,
      projectionBand: coastBand,
    },
    {
      tier: "barista",
      label: "Barista",
      targetAmount: fullTarget,
      progress:
        fullTarget > 0
          ? Math.min(1, (assets + partTimeIncome / swr) / fullTarget)
          : 0,
      met: baristaMet,
      plainWords: "Light part-time work bridges the gap",
    },
    {
      tier: "full",
      label: "Full",
      targetAmount: fullTarget,
      progress: computeProgressPct(assets, fullTarget),
      met: fullMet,
      plainWords: "The whole life is covered — work is optional",
      headroomDropPct: fullMet ? headroomFor(annualLifeCost) : null,
    },
  ];
}

export function computeRunwayMonths(input: {
  accessibleAssets: number;
  totalAssets: number;
  swr: number;
  fullMonthlySpend: number;
  essentialMonthlySpend: number;
  partTimeMonthly?: number;
}): number | null {
  const passiveMonthly = computePassiveMonthlyIncome(input.totalAssets, input.swr);
  const partTimeMonthly = input.partTimeMonthly ?? 0;
  const netBurn =
    input.fullMonthlySpend - passiveMonthly - partTimeMonthly;

  if (netBurn <= 0) return null;
  if (input.accessibleAssets <= 0) return 0;
  return input.accessibleAssets / netBurn;
}

export type RunwayLevers = {
  cutToEssentials: boolean;
  partTime: boolean;
};

export function computeRunwayWithLevers(input: {
  accessibleAssets: number;
  totalAssets: number;
  swr: number;
  fullMonthlySpend: number;
  essentialMonthlySpend: number;
  partTimeIncomeAnnual: number;
  levers: RunwayLevers;
}): RunwayResult {
  const spend = input.levers.cutToEssentials
    ? input.essentialMonthlySpend
    : input.fullMonthlySpend;
  const partTimeMonthly = input.levers.partTime
    ? input.partTimeIncomeAnnual / 12
    : 0;
  const passiveMonthly = computePassiveMonthlyIncome(
    input.totalAssets,
    input.swr,
  );
  const netBurn = spend - passiveMonthly - partTimeMonthly;
  const indefinite = netBurn <= 0;
  const months = indefinite
    ? null
    : input.accessibleAssets <= 0
      ? 0
      : input.accessibleAssets / netBurn;

  return {
    scenario: input.levers.partTime
      ? "part_time"
      : input.levers.cutToEssentials
        ? "essentials"
        : "baseline",
    label: "Current levers",
    months,
    indefinite,
    netBurnMonthly: netBurn,
  };
}

export function computeRunwayScenarios(input: {
  accessibleAssets: number;
  totalAssets: number;
  swr: number;
  fullMonthlySpend: number;
  essentialMonthlySpend: number;
  partTimeIncomeAnnual: number;
}): RunwayResult[] {
  const partTimeMonthly = input.partTimeIncomeAnnual / 12;
  const passiveMonthly = computePassiveMonthlyIncome(input.totalAssets, input.swr);

  const scenarios: Array<{
    scenario: RunwayScenario;
    label: string;
    spend: number;
    partTime: number;
  }> = [
    { scenario: "baseline", label: "Baseline", spend: input.fullMonthlySpend, partTime: 0 },
    {
      scenario: "essentials",
      label: "Cut to essentials",
      spend: input.essentialMonthlySpend,
      partTime: 0,
    },
    {
      scenario: "part_time",
      label: "With part-time",
      spend: input.fullMonthlySpend,
      partTime: partTimeMonthly,
    },
  ];

  return scenarios.map(({ scenario, label, spend, partTime }) => {
    const netBurn = spend - passiveMonthly - partTime;
    const indefinite = netBurn <= 0;
    const months = indefinite
      ? null
      : input.accessibleAssets <= 0
        ? 0
        : input.accessibleAssets / netBurn;

    return {
      scenario,
      label,
      months,
      indefinite,
      netBurnMonthly: netBurn,
    };
  });
}

export function computeLifePlanDerived(input: {
  categories: LifeExpenseCategoryInput[];
  assets: number;
  accessibleAssets: number;
  swr: number;
  assumptions: TierAssumptionInput;
  previouslySecuredCategoryIds?: Set<string>;
}): LifePlanDerived {
  const annualLifeCost = computeAnnualLifeCost(input.categories);
  const essentialAnnualCost = computeEssentialAnnualCost(input.categories);
  const essentialMonthlyBurn = essentialAnnualCost / 12;
  const fullMonthlySpend = annualLifeCost / 12;
  const target = computeTarget(annualLifeCost, input.swr);
  const progressPct = computeProgressPct(input.assets, target);
  const passiveMonthlyIncome = computePassiveMonthlyIncome(
    input.assets,
    input.swr,
  );

  const categoryCoverage = computeCategoryCoverage(
    input.categories,
    input.assets,
    input.swr,
    { previouslySecuredIds: input.previouslySecuredCategoryIds },
  );

  const securedCategoryCount = categoryCoverage.filter((c) => c.secured).length;
  const nextCoverage = categoryCoverage.find((c) => !c.secured);
  const coverageHeadroom = computeCoverageHeadroom(categoryCoverage);

  const tiers = computeTierStatuses({
    assets: input.assets,
    annualLifeCost,
    essentialAnnualCost,
    assumptions: input.assumptions,
  });

  const projectionBand = computeProjectionBand({
    assets: input.assets,
    target,
    expectedReturn: input.assumptions.expectedReturn,
  });

  const runway = computeRunwayScenarios({
    accessibleAssets: input.accessibleAssets,
    totalAssets: input.assets,
    swr: input.swr,
    fullMonthlySpend,
    essentialMonthlySpend: essentialMonthlyBurn,
    partTimeIncomeAnnual: input.assumptions.partTimeIncome,
  });

  return {
    annualLifeCost,
    essentialAnnualCost,
    essentialMonthlyBurn,
    fullMonthlySpend,
    target,
    progressPct,
    passiveMonthlyIncome,
    categoryCoverage,
    securedCategoryCount,
    coverageHeadroom,
    projectionBand,
    nextCoverageLabel: nextCoverage?.label ?? null,
    tiers,
    runway,
  };
}
