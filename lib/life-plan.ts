export const DEFAULT_SWR = 0.04;
export const DEFAULT_EXPECTED_RETURN = 0.07;
export const DEFAULT_INFLATION_RATE = 0.03;
export const DEFAULT_PART_TIME_INCOME = 12_000;
/** Buffer above cumulative cost before a category is marked secured (M2 hysteresis seed). */
export const COVERAGE_SECURE_BUFFER = 0.05;

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
};

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

    return {
      id: category.id,
      label: category.label,
      annualAmount: category.annualAmount,
      isEssential: category.isEssential,
      sortOrder: category.sortOrder,
      cumulativeCost: cumulative,
      secured,
      progressToSecure,
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

  return [
    {
      tier: "lean",
      label: "Lean",
      targetAmount: leanTarget,
      progress: leanTarget > 0 ? Math.min(1, assets / leanTarget) : 0,
      met: leanMet,
      plainWords: "Your essentials are covered for good",
    },
    {
      tier: "coast",
      label: "Coast",
      targetAmount: fullTarget,
      progress: fullTarget > 0 ? Math.min(1, assets / fullTarget) : 0,
      met: coastMet,
      plainWords: "Stop adding and still arrive at your full life",
      isProjection: true,
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

  const tiers = computeTierStatuses({
    assets: input.assets,
    annualLifeCost,
    essentialAnnualCost,
    assumptions: input.assumptions,
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
    nextCoverageLabel: nextCoverage?.label ?? null,
    tiers,
    runway,
  };
}
