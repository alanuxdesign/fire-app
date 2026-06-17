import type { BudgetSummary } from "@/lib/budget-types";
import type { LifeExpenseCategoryInput } from "@/lib/life-plan";
import { DEFAULT_LIFE_EXPENSE_CATEGORIES } from "@/lib/life-plan-defaults";

const BUDGET_TO_LIFE_LABEL: Record<string, string> = {
  housing: "Housing",
  rent: "Housing",
  mortgage: "Housing",
  food: "Food",
  groceries: "Food",
  dining: "Food",
  health: "Healthcare",
  healthcare: "Healthcare",
  medical: "Healthcare",
  transport: "Transport",
  transportation: "Transport",
  auto: "Transport",
  travel: "Fun & travel",
  entertainment: "Fun & travel",
  fun: "Fun & travel",
  giving: "Giving",
  charity: "Giving",
};

function matchLifeLabel(bucketLabel: string): string | null {
  const normalized = bucketLabel.trim().toLowerCase();
  for (const [key, lifeLabel] of Object.entries(BUDGET_TO_LIFE_LABEL)) {
    if (normalized.includes(key)) return lifeLabel;
  }
  return null;
}

/**
 * Pre-fill life expense categories from budget bucket targets/spend when available.
 * Falls back to static defaults when budget data is sparse.
 */
export function categoriesFromBudgetSummary(
  summary: BudgetSummary | null,
): LifeExpenseCategoryInput[] {
  const base = DEFAULT_LIFE_EXPENSE_CATEGORIES.map((c) => ({ ...c }));
  if (!summary || summary.buckets.length === 0) return base;

  const annualByLifeLabel = new Map<string, number>();

  for (const bucket of summary.buckets) {
    if (bucket.isVirtual) continue;
    const lifeLabel = matchLifeLabel(bucket.label);
    if (!lifeLabel) continue;

    const monthly =
      bucket.target > 0 ? bucket.target : bucket.spent > 0 ? bucket.spent : 0;
    if (monthly <= 0) continue;

    const annual = monthly * 12;
    annualByLifeLabel.set(
      lifeLabel,
      (annualByLifeLabel.get(lifeLabel) ?? 0) + annual,
    );
  }

  if (annualByLifeLabel.size === 0) return base;

  return base.map((category) => {
    const fromBudget = annualByLifeLabel.get(category.label);
    if (fromBudget && fromBudget > 0) {
      return { ...category, annualAmount: Math.round(fromBudget) };
    }
    return category;
  });
}
