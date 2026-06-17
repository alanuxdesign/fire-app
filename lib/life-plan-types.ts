import type { LifePlanDerived, TierAssumptionInput } from "@/lib/life-plan";

export const MAX_LIFESTYLE_PLANS = 5;

export type SerializedLifePhase = {
  id: string;
  label: string;
  sortOrder: number;
};

export type SerializedExpenseCategory = {
  id: string;
  label: string;
  annualAmount: number;
  isEssential: boolean;
  phaseId: string | null;
  sortOrder: number;
  budgetCategoryId: string | null;
};

export type SerializedTierAssumptions = TierAssumptionInput;

export type SerializedMilestoneEvent = {
  id: string;
  type: "category" | "tier";
  ref: string;
  securedAt: string;
  bufferClearAt: string | null;
};

export type SerializedContingencyPlan = {
  id: string;
  scenario: "job_loss" | "big_expense" | "downturn";
  levers: Record<string, unknown>;
  savedAt: string;
};

export type LifePlanSnapshot = {
  plan: {
    id: string;
    label: string;
    swr: number;
    zipCode: string | null;
    householdSize: number;
    isPrimary: boolean;
    sortOrder: number;
    createdAt: string;
    phases: SerializedLifePhase[];
    categories: SerializedExpenseCategory[];
    tierAssumptions: SerializedTierAssumptions;
    milestoneEvents: SerializedMilestoneEvent[];
    contingencyPlans: SerializedContingencyPlan[];
  };
  assets: {
    totalInvestedLiquid: number;
    totalAccessible: number;
  };
  derived: LifePlanDerived;
};

export type LifePlanListItem = {
  id: string;
  label: string;
  isPrimary: boolean;
  sortOrder: number;
  annualLifeCost: number;
  target: number;
  progressPct: number;
};

export type LifePlanBundle = {
  snapshot: LifePlanSnapshot | null;
  plans: LifePlanListItem[];
  primaryPlanId: string | null;
  viewedPlanId: string | null;
};
