import { getMerchantKey } from "@/lib/merchant-key";
import { merchantRules, transactions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, eq, gte } from "drizzle-orm";

export type UpsertMerchantRuleInput = {
  userId: string;
  merchantKey: string;
  displayName?: string | null;
  defaultCategoryId?: string | null;
  defaultTagIds?: string[];
  requiresReview?: boolean;
  applyToFuture?: boolean;
};

export async function upsertMerchantRule(
  input: UpsertMerchantRuleInput,
): Promise<typeof merchantRules.$inferSelect> {
  const existing = await db.query.merchantRules.findFirst({
    where: and(
      eq(merchantRules.userId, input.userId),
      eq(merchantRules.merchantKey, input.merchantKey),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(merchantRules)
      .set({
        displayName: input.displayName ?? existing.displayName,
        defaultCategoryId:
          input.defaultCategoryId !== undefined
            ? input.defaultCategoryId
            : existing.defaultCategoryId,
        defaultTagIds: input.defaultTagIds ?? existing.defaultTagIds,
        requiresReview:
          input.requiresReview ?? existing.requiresReview,
        applyToFuture: input.applyToFuture ?? existing.applyToFuture,
        updatedAt: new Date(),
      })
      .where(eq(merchantRules.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(merchantRules)
    .values({
      userId: input.userId,
      merchantKey: input.merchantKey,
      displayName: input.displayName ?? null,
      defaultCategoryId: input.defaultCategoryId ?? null,
      defaultTagIds: input.defaultTagIds ?? [],
      requiresReview: input.requiresReview ?? false,
      applyToFuture: input.applyToFuture ?? true,
    })
    .returning();

  return inserted;
}

export async function applyMerchantRuleRetroactive(options: {
  userId: string;
  merchantKey: string;
  categoryId: string | null;
  monthsBack?: number;
  markReviewed?: boolean;
}): Promise<number> {
  const monthsBack = options.monthsBack ?? 24;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, options.userId),
      gte(transactions.date, cutoffStr),
    ),
  });

  let updated = 0;
  for (const row of rows) {
    const key = getMerchantKey(row.merchantName, row.name);
    if (key !== options.merchantKey) continue;

    await db
      .update(transactions)
      .set({
        userCategoryId: options.categoryId,
        reviewStatus: options.markReviewed ? "reviewed" : row.reviewStatus,
        reviewedAt: options.markReviewed ? new Date() : row.reviewedAt,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, row.id));
    updated += 1;
  }

  return updated;
}
