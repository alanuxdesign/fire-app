import { requireWritableUser } from "@/lib/api-auth";
import { listBudgetCategoriesForUser } from "@/lib/budget-categories";
import { serializeTransaction } from "@/lib/plaid-transactions";
import { transactionTags, transactions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    userCategoryId?: string | null;
    includeInBudget?: boolean;
    note?: string | null;
    reviewStatus?: "pending" | "reviewed" | null;
    tagIds?: string[];
    duplicateOfTransactionId?: string | null;
  };

  const existing = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.id, id),
      eq(transactions.userId, authResult.userId),
    ),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(transactions)
    .set({
      ...(body.userCategoryId !== undefined
        ? { userCategoryId: body.userCategoryId }
        : {}),
      ...(body.includeInBudget !== undefined
        ? { includeInBudget: body.includeInBudget }
        : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      ...(body.reviewStatus !== undefined
        ? {
            reviewStatus: body.reviewStatus,
            reviewedAt:
              body.reviewStatus === "reviewed" ? new Date() : null,
          }
        : {}),
      ...(body.duplicateOfTransactionId !== undefined
        ? { duplicateOfTransactionId: body.duplicateOfTransactionId }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, id))
    .returning();

  if (body.tagIds) {
    await db
      .delete(transactionTags)
      .where(eq(transactionTags.transactionId, id));
    if (body.tagIds.length > 0) {
      await db.insert(transactionTags).values(
        body.tagIds.map((tagId) => ({
          transactionId: id,
          tagId,
        })),
      );
    }
  }

  const categories = await listBudgetCategoriesForUser(authResult.userId);
  const cat = updated.userCategoryId
    ? categories.find((c) => c.id === updated.userCategoryId)
    : null;

  const tags = await db.query.transactionTags.findMany({
    where: eq(transactionTags.transactionId, id),
  });

  return NextResponse.json({
    transaction: serializeTransaction({
      ...updated,
      tagIds: tags.map((t) => t.tagId),
      categoryLabel: cat?.label ?? null,
      categoryIcon: cat?.icon ?? null,
    }),
  });
}
