import type { BudgetCategoryAverage } from "@/lib/budget-rollups";
import type { LifeExpenseCategoryInput } from "@/lib/life-plan";

const ESSENTIAL_BUDGET_SLUGS = new Set([
  "groceries",
  "dining",
  "utilities",
  "bills",
  "transport",
  "health",
  "home",
  "fees",
]);

export function isEssentialBudgetSlug(slug: string): boolean {
  return ESSENTIAL_BUDGET_SLUGS.has(slug);
}

export function budgetAverageToLifeCategory(
  row: BudgetCategoryAverage,
  sortOrder: number,
): LifeExpenseCategoryInput {
  return {
    budgetCategoryId: row.budgetCategoryId,
    label: row.label,
    annualAmount: row.annualAmount,
    isEssential: isEssentialBudgetSlug(row.slug),
    sortOrder,
  };
}

/**
 * Merge budget 12-month averages into life categories.
 * Updates linked rows, adds new budget buckets, keeps custom rows untouched.
 */
export function mergeBudgetIntoLifeCategories(
  current: LifeExpenseCategoryInput[],
  averages: BudgetCategoryAverage[],
): LifeExpenseCategoryInput[] {
  const withSpend = averages.filter((a) => a.monthsWithSpend > 0);
  const byBudgetId = new Map(
    current.map((c, i) => [c.budgetCategoryId ?? `custom-${i}`, c]),
  );

  const custom = current.filter((c) => !c.budgetCategoryId);
  const merged: LifeExpenseCategoryInput[] = [];

  for (const row of withSpend) {
    const existing = current.find(
      (c) => c.budgetCategoryId === row.budgetCategoryId,
    );
    merged.push(
      existing
        ? {
            ...existing,
            label: row.label,
            annualAmount: row.annualAmount,
            isEssential: existing.isEssential || isEssentialBudgetSlug(row.slug),
          }
        : budgetAverageToLifeCategory(row, merged.length),
    );
    byBudgetId.delete(row.budgetCategoryId);
  }

  return [
    ...merged.map((c, i) => ({ ...c, sortOrder: i })),
    ...custom.map((c, i) => ({ ...c, sortOrder: merged.length + i })),
  ];
}

export function addRecommendedBucket(
  current: LifeExpenseCategoryInput[],
  row: BudgetCategoryAverage,
): LifeExpenseCategoryInput[] {
  if (
    current.some((c) => c.budgetCategoryId === row.budgetCategoryId) ||
    current.some((c) => c.label.toLowerCase() === row.label.toLowerCase())
  ) {
    return current;
  }
  return [
    ...current,
    budgetAverageToLifeCategory(row, current.length),
  ];
}

export type BudgetSyncSummary = {
  monthsSampled: number;
  bucketsWithData: number;
  totalAnnual: number;
};

export function summarizeBudgetSync(
  categories: LifeExpenseCategoryInput[],
  monthsSampled: number,
): BudgetSyncSummary {
  return {
    monthsSampled,
    bucketsWithData: categories.filter((c) => c.budgetCategoryId).length,
    totalAnnual: categories.reduce((s, c) => s + c.annualAmount, 0),
  };
}
