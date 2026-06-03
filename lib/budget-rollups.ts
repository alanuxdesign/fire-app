import { parseBalance } from "@/lib/account-groups";
import { isIncomeCategory, listBudgetCategoriesForUser } from "@/lib/budget-categories";
import {
  getCurrentBudgetMonth,
  getMonthBounds,
  shiftBudgetMonth,
} from "@/lib/budget-month";
import {
  budgetCategories,
  budgetTargets,
  budgetUserSettings,
  financialAccounts,
  transactions,
} from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, eq, gte, lte, sql } from "drizzle-orm";

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
  unreviewedCount: number;
  notCountedTotal: number;
  includePendingInBudget: boolean;
  buckets: BudgetSummaryBucket[];
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

export async function getBudgetSummary(
  userId: string,
  month: string,
): Promise<BudgetSummary> {
  const settings = await getBudgetUserSettings(userId);
  const includePending = settings.includePendingInBudget;

  const categories = await listBudgetCategoriesForUser(userId);

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const targets = await db.query.budgetTargets.findMany({
    where: and(
      eq(budgetTargets.userId, userId),
      eq(budgetTargets.month, month),
    ),
  });
  const targetByCategory = new Map(
    targets.map((t) => [t.categoryId, parseBalance(t.amount)]),
  );

  const monthTxns = await loadMonthTransactions(userId, month);

  let totalSpent = 0;
  let income = 0;
  let notCountedTotal = 0;
  const spentByCategory = new Map<string, number>();
  let uncategorizedSpent = 0;

  for (const txn of monthTxns) {
    const amount = parseBalance(txn.amount);
    const category = txn.userCategoryId
      ? categoryById.get(txn.userCategoryId)
      : null;
    const incomeCat = isIncomeCategory(
      txn.primaryCategory,
      category ?? null,
    );

    if (!txn.includeInBudget) {
      if (amount > 0) notCountedTotal += amount;
      continue;
    }

    if (incomeCat) {
      income += Math.abs(amount);
      continue;
    }

    if (!txnCountsForBudget(txn, false, includePending)) {
      continue;
    }

    totalSpent += amount;

    if (txn.userCategoryId) {
      spentByCategory.set(
        txn.userCategoryId,
        (spentByCategory.get(txn.userCategoryId) ?? 0) + amount,
      );
    } else {
      uncategorizedSpent += amount;
    }
  }

  const spendBuckets: BudgetSummaryBucket[] = categories
    .filter(
      (c) =>
        !c.isIncome &&
        c.slug !== "transfer" &&
        c.slug !== "income",
    )
    .map((c) => {
      const spent = spentByCategory.get(c.id) ?? 0;
      const target = targetByCategory.get(c.id) ?? 0;
      return {
        id: c.id,
        slug: c.slug,
        label: c.label,
        icon: c.icon,
        spent,
        target,
        progress: bucketProgress(spent, target),
        alertLevel: computeAlertLevel(spent, target),
        isSystem: c.isSystem,
      };
    })
    .filter((b) => b.spent !== 0 || b.target > 0);

  const virtualBuckets: BudgetSummaryBucket[] = [];

  if (uncategorizedSpent !== 0) {
    virtualBuckets.push({
      id: null,
      slug: "uncategorized",
      label: "Uncategorized",
      icon: "HelpCircle",
      spent: uncategorizedSpent,
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

  if (notCountedTotal > 0) {
    virtualBuckets.push({
      id: null,
      slug: "not-counted",
      label: "Not counted",
      icon: "Ban",
      spent: notCountedTotal,
      target: 0,
      progress: 0,
      alertLevel: "none",
      isVirtual: true,
    });
  }

  const totalTarget = [...targetByCategory.values()].reduce(
    (sum, t) => sum + t,
    0,
  );

  const effectiveBudgetTotal = settings.monthlyBudgetTotal
    ? parseBalance(settings.monthlyBudgetTotal)
    : totalTarget;

  return {
    month,
    totalSpent,
    totalTarget,
    effectiveBudgetTotal,
    leftToSpend: Math.max(0, effectiveBudgetTotal - totalSpent),
    income,
    unreviewedCount,
    notCountedTotal,
    includePendingInBudget: includePending,
    buckets: [...spendBuckets, ...virtualBuckets],
  };
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
  if (!category) return [];

  const excludedAccountIds = await getExcludedBudgetAccountIds(userId);
  const results: { month: string; spent: number; target: number }[] = [];
  let month = getCurrentBudgetMonth();

  for (let i = 0; i < months; i++) {
    const { start, end } = getMonthBounds(month);
    const rows = await db.query.transactions.findMany({
      where: and(
        eq(transactions.userId, userId),
        eq(transactions.userCategoryId, categoryId),
        gte(transactions.date, start),
        lte(transactions.date, end),
      ),
    });

    let spent = 0;
    for (const txn of rows) {
      if (excludedAccountIds.has(txn.financialAccountId)) continue;
      if (!txnCountsForBudget(txn, category.isIncome, includePending)) continue;
      spent += parseBalance(txn.amount);
    }

    const targetRow = await db.query.budgetTargets.findFirst({
      where: and(
        eq(budgetTargets.userId, userId),
        eq(budgetTargets.categoryId, categoryId),
        eq(budgetTargets.month, month),
      ),
    });

    results.unshift({
      month,
      spent,
      target: targetRow ? parseBalance(targetRow.amount) : 0,
    });
    month = shiftBudgetMonth(month, -1);
  }

  return results;
}
