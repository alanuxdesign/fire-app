export type BudgetAlertLevel = "none" | "warning" | "over";

export type BudgetSummaryBucket = {
  id: string | null;
  slug: string;
  label: string;
  icon: string;
  spent: number;
  target: number;
  progress: number;
  alertLevel?: BudgetAlertLevel;
  isVirtual?: boolean;
  isSystem?: boolean;
};

export type BudgetSummary = {
  month: string;
  totalSpent: number;
  totalTarget: number;
  effectiveBudgetTotal?: number;
  leftToSpend: number;
  income: number;
  unreviewedCount: number;
  notCountedTotal: number;
  includePendingInBudget?: boolean;
  buckets: BudgetSummaryBucket[];
};

export type SerializedTransaction = {
  id: string;
  financialAccountId: string;
  plaidTransactionId: string;
  date: string;
  authorizedDate: string | null;
  amount: number;
  name: string;
  merchantName: string | null;
  merchantKey: string;
  pending: boolean;
  userCategoryId: string | null;
  categoryLabel: string | null;
  categoryIcon: string | null;
  includeInBudget: boolean;
  note: string | null;
  isTransfer: boolean;
  reviewStatus: string | null;
  tagIds: string[];
};

export type BudgetCategoryOption = {
  id: string;
  slug: string;
  label: string;
  icon: string;
  isSystem: boolean;
  isIncome: boolean;
};

export type BudgetSettings = {
  includePendingInBudget: boolean;
  monthlyBudgetTotal: number | null;
};
