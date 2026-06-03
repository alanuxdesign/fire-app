import { requireUserId } from "@/lib/api-auth";
import { getMonthBounds } from "@/lib/budget-month";
import {
  buildCategoryIdRemap,
  categoryIdsForCanonical,
  listBudgetCategoriesForUser,
} from "@/lib/budget-categories";
import { getExcludedBudgetAccountIds } from "@/lib/budget-rollups";
import { serializeTransaction } from "@/lib/plaid-transactions";
import { transactionTags, transactions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, desc, eq, gte, ilike, inArray, isNull, lte, or } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const categoryId = searchParams.get("categoryId");
  const tagId = searchParams.get("tagId");
  const accountId = searchParams.get("accountId");
  const reviewStatus = searchParams.get("reviewStatus");
  const virtual = searchParams.get("virtual");
  const search = searchParams.get("search")?.trim();
  const forBudget = searchParams.get("forBudget") === "1";
  const limit = Math.min(500, Number(searchParams.get("limit") ?? "100"));

  const conditions = [eq(transactions.userId, authResult.userId)];

  if (month) {
    const { start, end } = getMonthBounds(month);
    conditions.push(gte(transactions.date, start));
    conditions.push(lte(transactions.date, end));
  } else {
    if (from) conditions.push(gte(transactions.date, from));
    if (to) conditions.push(lte(transactions.date, to));
  }

  if (accountId) {
    conditions.push(eq(transactions.financialAccountId, accountId));
  }

  if (categoryId) {
    const categories = await listBudgetCategoriesForUser(authResult.userId);
    const idRemap = await buildCategoryIdRemap(authResult.userId, categories);
    const categoryIds = categoryIdsForCanonical(categoryId, idRemap);
    conditions.push(inArray(transactions.userCategoryId, categoryIds));
  }

  if (reviewStatus) {
    conditions.push(eq(transactions.reviewStatus, reviewStatus));
  }

  if (virtual === "uncategorized") {
    conditions.push(isNull(transactions.userCategoryId));
  }

  if (virtual === "not-counted") {
    conditions.push(eq(transactions.includeInBudget, false));
  }

  if (search) {
    conditions.push(
      or(
        ilike(transactions.name, `%${search}%`),
        ilike(transactions.merchantName, `%${search}%`),
      )!,
    );
  }

  let rows = await db.query.transactions.findMany({
    where: and(...conditions),
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    limit: tagId ? 500 : limit,
  });

  if (tagId) {
    const tagged = await db
      .select({ transactionId: transactionTags.transactionId })
      .from(transactionTags)
      .where(eq(transactionTags.tagId, tagId));
    const allowed = new Set(tagged.map((t) => t.transactionId));
    rows = rows.filter((r) => allowed.has(r.id)).slice(0, limit);
  }

  let filtered = rows;
  if (forBudget) {
    const excluded = await getExcludedBudgetAccountIds(authResult.userId);
    filtered = rows.filter((r) => !excluded.has(r.financialAccountId));
  }

  const categories = await listBudgetCategoriesForUser(authResult.userId);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const tagIdsByTxn = new Map<string, string[]>();
  if (filtered.length > 0) {
    const tagRows = await db
      .select()
      .from(transactionTags)
      .where(inArray(transactionTags.transactionId, filtered.map((r) => r.id)));
    for (const row of tagRows) {
      const list = tagIdsByTxn.get(row.transactionId) ?? [];
      list.push(row.tagId);
      tagIdsByTxn.set(row.transactionId, list);
    }
  }

  return NextResponse.json({
    transactions: filtered.map((row) => {
      const cat = row.userCategoryId
        ? categoryById.get(row.userCategoryId)
        : null;
      return serializeTransaction({
        ...row,
        tagIds: tagIdsByTxn.get(row.id) ?? [],
        categoryLabel: cat?.label ?? null,
        categoryIcon: cat?.icon ?? null,
      });
    }),
  });
}
