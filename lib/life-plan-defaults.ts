import type { LifeExpenseCategoryInput } from "@/lib/life-plan";

/** Starter life-cost categories with typical annual ranges (midpoint pre-filled). */
export const DEFAULT_LIFE_EXPENSE_CATEGORIES: LifeExpenseCategoryInput[] = [
  { label: "Housing", annualAmount: 24_000, isEssential: true, sortOrder: 0 },
  { label: "Food", annualAmount: 8_400, isEssential: true, sortOrder: 1 },
  { label: "Healthcare", annualAmount: 6_000, isEssential: true, sortOrder: 2 },
  { label: "Transport", annualAmount: 4_800, isEssential: true, sortOrder: 3 },
  { label: "Fun & travel", annualAmount: 4_800, isEssential: false, sortOrder: 4 },
  { label: "Giving", annualAmount: 2_400, isEssential: false, sortOrder: 5 },
  { label: "Other", annualAmount: 3_600, isEssential: false, sortOrder: 6 },
];

export const BORROW_A_LIFE_TEMPLATE = {
  label: "A calmer week with more time for what matters",
  categories: DEFAULT_LIFE_EXPENSE_CATEGORIES,
};
