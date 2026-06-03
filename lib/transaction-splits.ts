import { parseBalance } from "@/lib/account-groups";
import {
  buildCategoryIdRemap,
  listBudgetCategoriesForUser,
  resolveCanonicalCategoryId,
  type BudgetCategoryRow,
} from "@/lib/budget-categories";
import { transactionSplits, transactions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, asc, eq, inArray } from "drizzle-orm";

export type TransactionSplitRow = {
  id: string;
  categoryId: string;
  amount: number;
  sortOrder: number;
};

export async function getSplitsForTransaction(
  transactionId: string,
): Promise<TransactionSplitRow[]> {
  const rows = await db.query.transactionSplits.findMany({
    where: eq(transactionSplits.transactionId, transactionId),
    orderBy: [asc(transactionSplits.sortOrder)],
  });
  return rows.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    amount: parseBalance(r.amount),
    sortOrder: r.sortOrder,
  }));
}

export async function getSplitsByTransactionIds(
  transactionIds: string[],
): Promise<Map<string, TransactionSplitRow[]>> {
  const map = new Map<string, TransactionSplitRow[]>();
  if (transactionIds.length === 0) return map;

  const rows = await db.query.transactionSplits.findMany({
    where: inArray(transactionSplits.transactionId, transactionIds),
    orderBy: [asc(transactionSplits.sortOrder)],
  });

  for (const r of rows) {
    const list = map.get(r.transactionId) ?? [];
    list.push({
      id: r.id,
      categoryId: r.categoryId,
      amount: parseBalance(r.amount),
      sortOrder: r.sortOrder,
    });
    map.set(r.transactionId, list);
  }
  return map;
}

export async function replaceTransactionSplits(
  userId: string,
  transactionId: string,
  lines: { categoryId: string; amount: number }[],
): Promise<TransactionSplitRow[]> {
  const txn = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.id, transactionId),
      eq(transactions.userId, userId),
    ),
  });
  if (!txn) throw new Error("Transaction not found");

  const parentAmount = parseBalance(txn.amount);
  const sum = lines.reduce((s, l) => s + l.amount, 0);
  if (Math.abs(sum - parentAmount) > 0.01) {
    throw new Error("Split amounts must sum to the transaction amount");
  }

  await db
    .delete(transactionSplits)
    .where(eq(transactionSplits.transactionId, transactionId));

  if (lines.length === 0) {
    await db
      .update(transactions)
      .set({ hasSplits: false, updatedAt: new Date() })
      .where(eq(transactions.id, transactionId));
    return [];
  }

  const inserted = await db
    .insert(transactionSplits)
    .values(
      lines.map((line, i) => ({
        transactionId,
        categoryId: line.categoryId,
        amount: String(line.amount),
        sortOrder: i,
      })),
    )
    .returning();

  await db
    .update(transactions)
    .set({ hasSplits: true, updatedAt: new Date() })
    .where(eq(transactions.id, transactionId));

  return inserted.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    amount: parseBalance(r.amount),
    sortOrder: r.sortOrder,
  }));
}

/** Map split category ids to canonical ids for rollups. */
export function remapSplitLines(
  lines: TransactionSplitRow[],
  categoryById: Map<string, BudgetCategoryRow>,
  idRemap: Map<string, string>,
): { categoryId: string; amount: number }[] {
  return lines
    .map((line) => {
      const canonical = resolveCanonicalCategoryId(
        line.categoryId,
        categoryById,
        idRemap,
      );
      if (!canonical) return null;
      return { categoryId: canonical, amount: line.amount };
    })
    .filter((x): x is { categoryId: string; amount: number } => x !== null);
}

export async function validateSplitCategories(
  userId: string,
  categoryIds: string[],
): Promise<void> {
  const categories = await listBudgetCategoriesForUser(userId);
  const allowed = new Set(categories.map((c) => c.id));
  const remap = await buildCategoryIdRemap(userId, categories);
  for (const id of categoryIds) {
    const canonical = remap.get(id) ?? id;
    if (!allowed.has(canonical)) {
      throw new Error("Invalid category for split");
    }
  }
}
