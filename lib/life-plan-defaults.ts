import type { LifeExpenseCategoryInput } from "@/lib/life-plan";

/** Core life-cost lines — users can add, remove, or sync from Budget buckets. */
export const DEFAULT_LIFE_EXPENSE_CATEGORIES: LifeExpenseCategoryInput[] = [
  { label: "Housing", annualAmount: 24_000, isEssential: true, sortOrder: 0 },
  { label: "Food", annualAmount: 8_400, isEssential: true, sortOrder: 1 },
  { label: "Healthcare", annualAmount: 6_000, isEssential: true, sortOrder: 2 },
  { label: "Transport", annualAmount: 4_800, isEssential: true, sortOrder: 3 },
  { label: "Personal & fun", annualAmount: 7_200, isEssential: false, sortOrder: 4 },
];

export const BORROW_A_LIFE_TEMPLATE = {
  label: "A calmer week with more time for what matters",
  categories: DEFAULT_LIFE_EXPENSE_CATEGORIES,
};
