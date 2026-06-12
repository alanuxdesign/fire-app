import { parseBalance } from "@/lib/account-groups";
import {
  buildCategoryIdRemap,
  categoryIdsForCanonical,
  getRolloverOverrides,
  isIncomeCategory,
  listBudgetCategoriesForUser,
  resolveCanonicalCategoryId,
} from "@/lib/budget-categories";
import {
  getCurrentBudgetMonth,
  getMonthBounds,
  shiftBudgetMonth,
} from "@/lib/budget-month";
import { getCommittedBillsTotal } from "@/lib/recurring-bills";
import {
  getSplitsByTransactionIds,
  remapSplitLines,
  type TransactionSplitRow,
} from "@/lib/transaction-splits";
import {
  budgetCategories,
  budgetTargets,
  budgetUserSettings,
  financialAccounts,
  transactions,
} from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";

export type BudgetAlertLevel = "none" | "warning" | "over";

export type BudgetSummaryBucket = {
  id: string | null;
  slug: string;
  label: string;
  icon: string;
  spent: number;
  target: number;
  progress: number;
  alertLevel: BudgetAlertLevel;
  rolloverEnabled?: boolean;
  isVirtual?: boolean;
  isSystem?: boolean;
};

export type BudgetSummary = {
  month: string;
  totalSpent: number;
  totalTarget: number;
  effectiveBudgetTotal: number;
  leftToSpend: number;
  income: number;
  savingsRate: number | null;
  billsCommitted: number;
  unreviewedCount: number;
  notCountedTotal: number;
  includePendingInBudget: boolean;
  buckets: BudgetSummaryBucket[];
};

export type CashFlowPoint = {
  month: string;
  income: number;
  expense: number;
  net: number;
};

type TransactionRow = typeof transactions.$inferSelect;

function computeAlertLevel(spent: number, target: number): BudgetAlertLevel {
  if (target <= 0) return "none";
  if (spent >= target) return "over";
  if (spent >= target * 0.8) return "warning";
  return "none";
}

function bucketProgress(spent: number, target: number): number {
  if (target <= 0) return 0;
  return spent / target;
}

export async function getExcludedBudgetAccountIds(
  userId: string,
): Promise<Set<string>> {
  const accounts = await db.query.financialAccounts.findMany({
    where: eq(financialAccounts.userId, userId),
  });
  return new Set(
    accounts.filter((a) => a.excludeFromBudget).map((a) => a.id),
  );
}

function txnCountsForBudget(
  row: TransactionRow,
  categoryIsIncome: boolean,
  includePending: boolean,
): boolean {
  if (row.duplicateOfTransactionId) return false;
  if (!row.includeInBudget) return false;
  if (row.isTransfer) return false;
  if (row.reviewStatus === "pending") return false;
  if (row.pending && !includePending) return false;
  if (categoryIsIncome) return false;
  return true;
}

export async function getBudgetUserSettings(userId: string) {
  const existing = await db.query.budgetUserSettings.findFirst({
    where: eq(budgetUserSettings.userId, userId),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(budgetUserSettings)
    .values({ userId })
    .onConflictDoNothing()
    .returning();
  return (
    created ??
    (await db.query.budgetUserSettings.findFirst({
      where: eq(budgetUserSettings.userId, userId),
    }))!
  );
}

export async function getReviewCount(userId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.reviewStatus, "pending"),
      ),
    );
  return rows[0]?.count ?? 0;
}

async function loadMonthTransactions(
  userId: string,
  month: string,
): Promise<TransactionRow[]> {
  const { start, end } = getMonthBounds(month);
  const excludedAccountIds = await getExcludedBudgetAccountIds(userId);

  const rows = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      gte(transactions.date, start),
      lte(transactions.date, end),
    ),
  });

  return rows.filter((r) => !excludedAccountIds.has(r.financialAccountId));
}

type MonthRollup = {
  totalSpent: number;
  income: number;
  notCountedTotal: number;
  spentByCategory: Map<string, number>;
  uncategorizedSpent: number;
};

async function aggregateMonth(
  userId: string,
  month: string,
  includePending: boolean,
): Promise<MonthRollup> {
  const categories = await listBudgetCategoriesForUser(userId);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const categoryIdRemap = await buildCategoryIdRemap(userId, categories);

  const monthTxns = await loadMonthTransactions(userId, month);
  const splitTxnIds = monthTxns.filter((t) => t.hasSplits).map((t) => t.id);
  const splitsByTxn = await getSplitsByTransactionIds(splitTxnIds);

  let totalSpent = 0;
  let income = 0;
  let notCountedTotal = 0;
  const spentByCategory = new Map<string, number>();
  let uncategorizedSpent = 0;

  const addToCategory = (categoryId: string | null, amount: number) => {
    totalSpent += amount;
    if (categoryId) {
      spentByCategory.set(
        categoryId,
        (spentByCategory.get(categoryId) ?? 0) + amount,
      );
    } else {
      uncategorizedSpent += amount;
    }
  };

  for (const txn of monthTxns) {
    const amount = parseBalance(txn.amount);

    if (!txn.includeInBudget) {
      if (amount > 0) notCountedTotal += amount;
      continue;
    }

    const splits: TransactionSplitRow[] | undefined = splitsByTxn.get(txn.id);
    if (txn.hasSplits && splits && splits.length > 0) {
      const remapped = remapSplitLines(splits, categoryById, categoryIdRemap);
      if (!txnCountsForBudget(txn, false, includePending)) continue;
      for (const line of remapped) {
        const cat = categoryById.get(line.categoryId);
        if (isIncomeCategory(txn.primaryCategory, cat ?? null)) {
          income += Math.abs(line.amount);
          continue;
        }
        addToCategory(line.categoryId, line.amount);
      }
      continue;
    }

    const canonicalCategoryId = resolveCanonicalCategoryId(
      txn.userCategoryId,
      categoryById,
      categoryIdRemap,
    );
    const category = canonicalCategoryId
      ? categoryById.get(canonicalCategoryId)
      : null;
    const incomeCat = isIncomeCategory(
      txn.primaryCategory,
      category ?? null,
    );

    if (incomeCat) {
      income += Math.abs(amount);
      continue;
    }

    if (!txnCountsForBudget(txn, false, includePending)) {
      continue;
    }

    addToCategory(canonicalCategoryId, amount);
  }

  return {
    totalSpent,
    income,
    notCountedTotal,
    spentByCategory,
    uncategorizedSpent,
  };
}

function effectiveTargetForCategory(
  baseTarget: number,
  rolloverEnabled: boolean,
  prevBaseTarget: number,
  prevSpent: number,
): number {
  if (!rolloverEnabled || baseTarget <= 0) return baseTarget;
  const carry = Math.max(0, prevBaseTarget - prevSpent);
  return baseTarget + carry;
}

export async function getBudgetSummary(
  userId: string,
  month: string,
): Promise<BudgetSummary> {
  const settings = await getBudgetUserSettings(userId);
  const includePending = settings.includePendingInBudget;

  const categories = await listBudgetCategoriesForUser(userId);
  const prevMonth = shiftBudgetMonth(month, -1);

  const targets = await db.query.budgetTargets.findMany({
    where: and(
      eq(budgetTargets.userId, userId),
      inArray(budgetTargets.month, [month, prevMonth]),
    ),
  });
  const targetByCategoryMonth = new Map<string, number>();
  for (const t of targets) {
    targetByCategoryMonth.set(
      `${t.categoryId}:${t.month}`,
      parseBalance(t.amount),
    );
  }

  const rollup = await aggregateMonth(userId, month, includePending);
  const prevRollup = await aggregateMonth(userId, prevMonth, includePending);

  const spendBuckets: BudgetSummaryBucket[] = categories
    .filter(
      (c) =>
        !c.isIncome &&
        c.slug !== "transfer" &&
        c.slug !== "income",
    )
    .map((c) => {
      const spent = rollup.spentByCategory.get(c.id) ?? 0;
      const baseTarget = targetByCategoryMonth.get(`${c.id}:${month}`) ?? 0;
      const prevBase = targetByCategoryMonth.get(`${c.id}:${prevMonth}`) ?? 0;
      const prevSpent = prevRollup.spentByCategory.get(c.id) ?? 0;
      const target = effectiveTargetForCategory(
        baseTarget,
        c.rolloverEnabled,
        prevBase,
        prevSpent,
      );
      return {
        id: c.id,
        slug: c.slug,
        label: c.label,
        icon: c.icon,
        spent,
        target,
        progress: bucketProgress(spent, target),
        alertLevel: computeAlertLevel(spent, target),
        rolloverEnabled: c.rolloverEnabled,
        isSystem: c.isSystem,
      };
    })
    .filter((b) => Math.abs(b.spent) > 0.005 || b.target > 0)
    .sort((a, b) => Math.abs(b.spent) - Math.abs(a.spent));

  const virtualBuckets: BudgetSummaryBucket[] = [];

  if (rollup.uncategorizedSpent !== 0) {
    virtualBuckets.push({
      id: null,
      slug: "uncategorized",
      label: "Uncategorized",
      icon: "HelpCircle",
      spent: rollup.uncategorizedSpent,
      target: 0,
      progress: 0,
      alertLevel: "none",
      isVirtual: true,
    });
  }

  const unreviewedCount = await getReviewCount(userId);
  if (unreviewedCount > 0) {
    virtualBuckets.push({
      id: null,
      slug: "review",
      label: "Needs review",
      icon: "Eye",
      spent: 0,
      target: 0,
      progress: 0,
      alertLevel: "none",
      isVirtual: true,
    });
  }

  if (rollup.notCountedTotal > 0) {
    virtualBuckets.push({
      id: null,
      slug: "not-counted",
      label: "Not counted",
      icon: "Ban",
      spent: rollup.notCountedTotal,
      target: 0,
      progress: 0,
      alertLevel: "none",
      isVirtual: true,
    });
  }

  const totalTarget = categories
    .filter((c) => !c.isIncome && c.slug !== "transfer" && c.slug !== "income")
    .reduce((sum, c) => {
      const base = targetByCategoryMonth.get(`${c.id}:${month}`) ?? 0;
      const prevBase = targetByCategoryMonth.get(`${c.id}:${prevMonth}`) ?? 0;
      const prevSpent = prevRollup.spentByCategory.get(c.id) ?? 0;
      return (
        sum +
        effectiveTargetForCategory(
          base,
          c.rolloverEnabled,
          prevBase,
          prevSpent,
        )
      );
    }, 0);

  const effectiveBudgetTotal = settings.monthlyBudgetTotal
    ? parseBalance(settings.monthlyBudgetTotal)
    : totalTarget;

  const billsCommitted = await getCommittedBillsTotal(userId, month);
  const savingsRate =
    rollup.income > 0
      ? (rollup.income - rollup.totalSpent) / rollup.income
      : null;

  return {
    month,
    totalSpent: rollup.totalSpent,
    totalTarget,
    effectiveBudgetTotal,
    leftToSpend: Math.max(
      0,
      effectiveBudgetTotal - rollup.totalSpent - billsCommitted,
    ),
    income: rollup.income,
    savingsRate,
    billsCommitted,
    unreviewedCount,
    notCountedTotal: rollup.notCountedTotal,
    includePendingInBudget: includePending,
    buckets: [...spendBuckets, ...virtualBuckets],
  };
}

export async function getCashFlowSeries(
  userId: string,
  months: number,
): Promise<CashFlowPoint[]> {
  const results: CashFlowPoint[] = [];
  let month = getCurrentBudgetMonth();
  const settings = await getBudgetUserSettings(userId);
  const includePending = settings.includePendingInBudget;

  for (let i = 0; i < months; i++) {
    const rollup = await aggregateMonth(userId, month, includePending);
    results.unshift({
      month,
      income: rollup.income,
      expense: rollup.totalSpent,
      net: rollup.income - rollup.totalSpent,
    });
    month = shiftBudgetMonth(month, -1);
  }

  return results;
}

export async function getBucketMonthlyTrends(
  userId: string,
  categoryId: string,
  months: number,
): Promise<{ month: string; spent: number; target: number }[]> {
  const settings = await getBudgetUserSettings(userId);
  const includePending = settings.includePendingInBudget;
  const category = await db.query.budgetCategories.findFirst({
    where: eq(budgetCategories.id, categoryId),
  });
  // Only categories visible to this user: their own or global system rows.
  if (!category || (category.userId !== null && category.userId !== userId)) {
    return [];
  }

  let rolloverEnabled = category.rolloverEnabled;
  if (category.userId === null) {
    const overrides = await getRolloverOverrides(userId);
    rolloverEnabled = overrides.get(category.id) ?? rolloverEnabled;
  }

  const categories = await listBudgetCategoriesForUser(userId);
  const categoryIdRemap = await buildCategoryIdRemap(userId, categories);
  const categoryIds = categoryIdsForCanonical(categoryId, categoryIdRemap);

  const excludedAccountIds = await getExcludedBudgetAccountIds(userId);
  const results: { month: string; spent: number; target: number }[] = [];
  let month = getCurrentBudgetMonth();

  const monthKeys: string[] = [];
  for (let i = 0; i < months; i++) {
    monthKeys.unshift(month);
    month = shiftBudgetMonth(month, -1);
  }

  const allTargets = await db.query.budgetTargets.findMany({
    where: and(
      eq(budgetTargets.userId, userId),
      eq(budgetTargets.categoryId, categoryId),
      inArray(budgetTargets.month, monthKeys),
    ),
  });
  const targetByMonth = new Map(
    allTargets.map((t) => [t.month, parseBalance(t.amount)]),
  );

  for (const m of monthKeys) {
    const { start, end } = getMonthBounds(m);
    const rows = await db.query.transactions.findMany({
      where: and(
        eq(transactions.userId, userId),
        inArray(transactions.userCategoryId, categoryIds),
        gte(transactions.date, start),
        lte(transactions.date, end),
      ),
    });

    const splitTxnIds = rows.filter((t) => t.hasSplits).map((t) => t.id);
    const splitsByTxn = await getSplitsByTransactionIds(splitTxnIds);
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    let spent = 0;
    for (const txn of rows) {
      if (excludedAccountIds.has(txn.financialAccountId)) continue;

      const splits = splitsByTxn.get(txn.id);
      if (txn.hasSplits && splits?.length) {
        if (!txnCountsForBudget(txn, category.isIncome, includePending)) continue;
        for (const line of remapSplitLines(splits, categoryById, categoryIdRemap)) {
          if (line.categoryId === categoryId) spent += line.amount;
        }
        continue;
      }

      if (!txnCountsForBudget(txn, category.isIncome, includePending)) continue;
      const canonical = resolveCanonicalCategoryId(
        txn.userCategoryId,
        categoryById,
        categoryIdRemap,
      );
      if (canonical === categoryId) spent += parseBalance(txn.amount);
    }

    const prevMonth = shiftBudgetMonth(m, -1);
    const baseTarget = targetByMonth.get(m) ?? 0;
    const prevBase = targetByMonth.get(prevMonth) ?? 0;

    let prevSpent = 0;
    if (rolloverEnabled) {
      const prevRollup = await aggregateMonth(userId, prevMonth, includePending);
      prevSpent = prevRollup.spentByCategory.get(categoryId) ?? 0;
    }

    const target = effectiveTargetForCategory(
      baseTarget,
      rolloverEnabled,
      prevBase,
      prevSpent,
    );

    results.push({ month: m, spent, target });
  }

  return results;
}
