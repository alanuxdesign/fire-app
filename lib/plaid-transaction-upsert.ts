import {
  isTransferCategory,
  resolveCategoryIdForPlaid,
} from "@/lib/budget-categories";
import { getMerchantKey, isAmbiguousMerchant } from "@/lib/merchant-key";
import {
  bucketSlugForPlaid,
  isLowPfcConfidence,
} from "@/lib/plaid-pfc-map";
import { merchantRules, transactions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { Transaction as PlaidTransaction } from "plaid";

export type MerchantRulesCache = Map<string, typeof merchantRules.$inferSelect>;

export async function loadMerchantRulesCache(
  userId: string,
): Promise<MerchantRulesCache> {
  const rules = await db.query.merchantRules.findMany({
    where: eq(merchantRules.userId, userId),
  });
  return new Map(rules.map((r) => [r.merchantKey, r]));
}

function applyMerchantRuleFromCache(
  rulesCache: MerchantRulesCache,
  merchantKey: string,
  base: {
    categoryId: string | null;
    reviewStatus: string | null;
  },
): { categoryId: string | null; reviewStatus: string | null } {
  const rule = rulesCache.get(merchantKey);

  if (!rule) {
    if (isAmbiguousMerchant(merchantKey) && !base.categoryId) {
      return { ...base, reviewStatus: "pending" };
    }
    return base;
  }

  if (rule.requiresReview) {
    return {
      categoryId: rule.defaultCategoryId ?? base.categoryId,
      reviewStatus: "pending",
    };
  }

  if (rule.applyToFuture && rule.defaultCategoryId) {
    return {
      categoryId: rule.defaultCategoryId,
      reviewStatus: null,
    };
  }

  return base;
}

function resolveReviewStatusForNewTxn(
  txn: PlaidTransaction,
  categoryId: string | null,
  ruledReviewStatus: string | null,
  merchantKey: string,
): string | null {
  if (ruledReviewStatus === "pending") return "pending";
  const confidence = txn.personal_finance_category?.confidence_level;
  if (isLowPfcConfidence(confidence) && !categoryId) return "pending";
  const slug = bucketSlugForPlaid(
    txn.personal_finance_category?.primary ?? null,
    txn.personal_finance_category?.detailed ?? null,
  );
  if (slug === "other" && isAmbiguousMerchant(merchantKey)) return "pending";
  return null;
}

function mapPlaidTxnToRow(
  txn: PlaidTransaction,
  userId: string,
  financialAccountId: string,
  categoryId: string | null,
  isTransfer: boolean,
  reviewStatus: string | null,
): typeof transactions.$inferInsert {
  const primary = txn.personal_finance_category?.primary ?? null;
  const detailed = txn.personal_finance_category?.detailed ?? null;

  return {
    userId,
    financialAccountId,
    plaidTransactionId: txn.transaction_id,
    plaidAccountId: txn.account_id,
    date: txn.date,
    authorizedDate: txn.authorized_date ?? null,
    amount: String(txn.amount),
    name: txn.name,
    merchantName: txn.merchant_name ?? null,
    pending: txn.pending,
    paymentChannel: txn.payment_channel ?? null,
    plaidCategory: txn.category ?? null,
    primaryCategory: primary,
    detailedCategory: detailed,
    userCategoryId: categoryId,
    includeInBudget: true,
    isTransfer,
    reviewStatus,
    reviewedAt: null,
  };
}

export type UpsertPlaidTransactionOptions = {
  preserveUserCategory?: boolean;
  rulesCache?: MerchantRulesCache;
};

export async function upsertPlaidTransaction(
  userId: string,
  txn: PlaidTransaction,
  financialAccountId: string,
  options: UpsertPlaidTransactionOptions = {},
): Promise<"inserted" | "updated"> {
  const rulesCache =
    options.rulesCache ?? (await loadMerchantRulesCache(userId));

  const existing = await db.query.transactions.findFirst({
    where: eq(transactions.plaidTransactionId, txn.transaction_id),
  });

  const primary = txn.personal_finance_category?.primary ?? null;
  const detailed = txn.personal_finance_category?.detailed ?? null;
  const isTransfer = isTransferCategory(primary, detailed);
  const mappedCategoryId = isTransfer
    ? await resolveCategoryIdForPlaid("TRANSFER_OUT", null)
    : await resolveCategoryIdForPlaid(primary, detailed);

  const merchantKey = getMerchantKey(txn.merchant_name, txn.name);
  const ruled = applyMerchantRuleFromCache(rulesCache, merchantKey, {
    categoryId: existing?.userCategoryId ?? mappedCategoryId,
    reviewStatus: existing?.reviewStatus ?? null,
  });

  const preserveUserCategory =
    options.preserveUserCategory === true
      ? true
      : options.preserveUserCategory === false
        ? false
        : Boolean(existing?.userCategoryId);

  const categoryId = preserveUserCategory
    ? existing!.userCategoryId
    : ruled.categoryId;

  const reviewStatus = preserveUserCategory
    ? existing!.reviewStatus
    : resolveReviewStatusForNewTxn(
        txn,
        categoryId,
        ruled.reviewStatus,
        merchantKey,
      );

  await db
    .insert(transactions)
    .values(
      mapPlaidTxnToRow(
        txn,
        userId,
        financialAccountId,
        categoryId,
        isTransfer,
        reviewStatus,
      ),
    )
    .onConflictDoUpdate({
      target: transactions.plaidTransactionId,
      set: {
        amount: String(txn.amount),
        name: txn.name,
        merchantName: txn.merchant_name ?? null,
        pending: txn.pending,
        primaryCategory: primary,
        detailedCategory: detailed,
        ...(preserveUserCategory
          ? {}
          : {
              userCategoryId: categoryId,
              reviewStatus,
            }),
        isTransfer,
        date: txn.date,
        authorizedDate: txn.authorized_date ?? null,
        updatedAt: new Date(),
      },
    });

  return existing ? "updated" : "inserted";
}
