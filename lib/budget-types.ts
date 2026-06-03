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
  rolloverEnabled?: boolean;
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
  savingsRate?: number | null;
  billsCommitted?: number;
  unreviewedCount: number;
  notCountedTotal: number;
  includePendingInBudget?: boolean;
  buckets: BudgetSummaryBucket[];
};

export type CashFlowPoint = {
  month: string;
  income: number;
  expense: number;
  net: number;
};

export type TransactionSplitLine = {
  id?: string;
  categoryId: string;
  amount: number;
};

export type RecurringBill = {
  id: string;
  name: string;
  merchantKey: string | null;
  expectedAmount: number;
  cadence: string;
  nextDueDate: string;
  categoryId: string | null;
  isActive: boolean;
};

export type DuplicateGroup = {
  ids: string[];
  amount: number;
  merchantLabel: string;
  dates: string[];
  reason: string;
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
  hasSplits?: boolean;
  duplicateOfTransactionId?: string | null;
};

export type BudgetCategoryOption = {
  id: string;
  slug: string;
  label: string;
  icon: string;
  isSystem: boolean;
  isIncome: boolean;
  rolloverEnabled?: boolean;
};

export type BudgetSettings = {
  includePendingInBudget: boolean;
  monthlyBudgetTotal: number | null;
};
