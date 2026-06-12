import {
  buildCategoryIdRemap,
  listBudgetCategoriesForUser,
} from "@/lib/budget-categories";
import { budgetTags, transactions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, eq, inArray } from "drizzle-orm";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Malformed ids would make Postgres reject the uuid cast with a 500;
// treat them as "not yours" instead.
function allValidUuids(ids: string[]): boolean {
  return ids.every((id) => UUID_PATTERN.test(id));
}

/**
 * True when every id is a budget category visible to the user
 * (their own or a global system bucket, including legacy duplicate ids).
 */
export async function categoriesBelongToUser(
  userId: string,
  categoryIds: (string | null | undefined)[],
): Promise<boolean> {
  const ids = categoryIds.filter((id): id is string => Boolean(id));
  if (ids.length === 0) return true;

  const categories = await listBudgetCategoriesForUser(userId);
  const allowed = new Set(categories.map((c) => c.id));
  const remap = await buildCategoryIdRemap(userId, categories);

  return ids.every((id) => allowed.has(remap.get(id) ?? id));
}

/** True when every id is one of the user's own tags. */
export async function tagsBelongToUser(
  userId: string,
  tagIds: string[],
): Promise<boolean> {
  if (tagIds.length === 0) return true;
  if (!allValidUuids(tagIds)) return false;

  const rows = await db.query.budgetTags.findMany({
    where: and(
      eq(budgetTags.userId, userId),
      inArray(budgetTags.id, tagIds),
    ),
    columns: { id: true },
  });

  const owned = new Set(rows.map((r) => r.id));
  return tagIds.every((id) => owned.has(id));
}

/** True when every id is one of the user's own transactions. */
export async function transactionsBelongToUser(
  userId: string,
  transactionIds: string[],
): Promise<boolean> {
  if (transactionIds.length === 0) return true;
  if (!allValidUuids(transactionIds)) return false;

  const rows = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      inArray(transactions.id, transactionIds),
    ),
    columns: { id: true },
  });

  const owned = new Set(rows.map((r) => r.id));
  return transactionIds.every((id) => owned.has(id));
}
