import { requireUserId } from "@/lib/api-auth";
import { getMonthBounds } from "@/lib/budget-month";
import { listBudgetCategoriesForUser } from "@/lib/budget-categories";
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
  const categoryId = searchParams.get("categoryId");
  const reviewStatus = searchParams.get("reviewStatus");
  const virtual = searchParams.get("virtual");
  const search = searchParams.get("search")?.trim();
  const forBudget = searchParams.get("forBudget") === "1";
  const limit = Math.min(200, Number(searchParams.get("limit") ?? "100"));

  const conditions = [eq(transactions.userId, authResult.userId)];

  if (month) {
    const { start, end } = getMonthBounds(month);
    conditions.push(gte(transactions.date, start));
    conditions.push(lte(transactions.date, end));
  }

  if (categoryId) {
    conditions.push(eq(transactions.userCategoryId, categoryId));
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

  const rows = await db.query.transactions.findMany({
    where: and(...conditions),
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    limit,
  });

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
