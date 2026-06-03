import { parseBalance } from "@/lib/account-groups";
import { getMerchantKey } from "@/lib/merchant-key";
import { toDateString } from "@/lib/purchase-date";
import {
  loadMerchantRulesCache,
  upsertPlaidTransaction,
  type MerchantRulesCache,
} from "@/lib/plaid-transaction-upsert";
import {
  financialAccounts,
  plaidItems,
  transactions,
} from "@/drizzle/schema";
import { db } from "@/lib/db";
import { getPlaidErrorMessage, plaidClient } from "@/lib/plaid";
import {
  computeSyncPercent,
  type TransactionSyncProgress,
} from "@/lib/transaction-sync-progress";
import { and, eq, inArray } from "drizzle-orm";
import { PersonalFinanceCategoryVersion } from "plaid";

const BUDGET_ACCOUNT_TYPES = new Set(["depository", "credit"]);

export type TransactionSyncResult = {
  added: number;
  modified: number;
  removed: number;
  itemsSynced: number;
};

function isBudgetAccountType(type: string): boolean {
  return BUDGET_ACCOUNT_TYPES.has(type);
}

async function syncItemTransactions(
  userId: string,
  item: typeof plaidItems.$inferSelect,
  accountByPlaidId: Map<string, string>,
  rulesCache: MerchantRulesCache,
  onPageComplete?: (pagesDone: number, hasMore: boolean, processed: number) => void,
): Promise<{ added: number; modified: number; removed: number }> {
  let cursor = item.transactionsCursor ?? undefined;
  let added = 0;
  let modified = 0;
  let removed = 0;
  let hasMore = true;
  let pagesDone = 0;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: item.accessToken,
      cursor,
      options: {
        personal_finance_category_version: PersonalFinanceCategoryVersion.V2,
      },
    });

    const data = response.data;

    for (const txn of data.added) {
      const financialAccountId = accountByPlaidId.get(txn.account_id);
      if (!financialAccountId) continue;

      await upsertPlaidTransaction(userId, txn, financialAccountId, {
        rulesCache,
        preserveUserCategory: false,
      });
      added += 1;
    }

    for (const txn of data.modified) {
      const financialAccountId = accountByPlaidId.get(txn.account_id);
      if (!financialAccountId) continue;

      await upsertPlaidTransaction(userId, txn, financialAccountId, {
        rulesCache,
        preserveUserCategory: true,
      });
      modified += 1;
    }

    if (data.removed.length > 0) {
      const ids = data.removed.map((r) => r.transaction_id);
      await db
        .delete(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            inArray(transactions.plaidTransactionId, ids),
          ),
        );
      removed += data.removed.length;
    }

    pagesDone += 1;
    onPageComplete?.(pagesDone, data.has_more, added + modified + removed);

    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  await db
    .update(plaidItems)
    .set({
      transactionsCursor: cursor ?? null,
      lastTransactionsSyncAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(plaidItems.id, item.id));

  return { added, modified, removed };
}

export type SyncProgressReporter = (progress: TransactionSyncProgress) => void;

export async function syncUserTransactions(
  userId: string,
  onProgress?: SyncProgressReporter,
): Promise<TransactionSyncResult | { error: string }> {
  const report = (partial: Omit<TransactionSyncProgress, "percent"> & {
    percent?: number;
  }) => {
    const progress: TransactionSyncProgress = {
      itemsDone: partial.itemsDone,
      itemsTotal: partial.itemsTotal,
      pagesDone: partial.pagesDone,
      transactionsProcessed: partial.transactionsProcessed,
      phase: partial.phase,
      message: partial.message,
      percent:
        partial.percent ??
        computeSyncPercent({
          itemsTotal: partial.itemsTotal,
          itemsDone: partial.itemsDone,
          pagesDone: partial.pagesDone,
          hasMore: partial.phase === "processing_page",
          phase: partial.phase,
        }),
    };
    onProgress?.(progress);
  };

  try {
    report({
      phase: "preparing",
      message: "Preparing budget sync…",
      itemsDone: 0,
      itemsTotal: 0,
      pagesDone: 0,
      transactionsProcessed: 0,
      percent: 2,
    });

    const { ensureSystemBudgetCategories } = await import(
      "@/lib/budget-categories"
    );
    await ensureSystemBudgetCategories();

    const items = await db.query.plaidItems.findMany({
      where: eq(plaidItems.userId, userId),
    });

    if (items.length === 0) {
      report({
        phase: "done",
        message: "No linked accounts to sync",
        itemsDone: 0,
        itemsTotal: 0,
        pagesDone: 0,
        transactionsProcessed: 0,
        percent: 100,
      });
      return { added: 0, modified: 0, removed: 0, itemsSynced: 0 };
    }

    const rulesCache = await loadMerchantRulesCache(userId);

    const accounts = await db.query.financialAccounts.findMany({
      where: and(
        eq(financialAccounts.userId, userId),
        eq(financialAccounts.isManual, false),
      ),
    });

    const accountByPlaidId = new Map<string, string>();
    for (const account of accounts) {
      if (
        !account.plaidAccountId ||
        !isBudgetAccountType(account.type) ||
        account.excludeFromBudget
      ) {
        continue;
      }
      accountByPlaidId.set(account.plaidAccountId, account.id);
    }

    report({
      phase: "preparing",
      message: "Loading transaction history…",
      itemsDone: 0,
      itemsTotal: items.length,
      pagesDone: 0,
      transactionsProcessed: 0,
      percent: 4,
    });

    const { backfillHistoricalTransactionsForUser } = await import(
      "@/lib/plaid-transaction-history"
    );
    const backfill = await backfillHistoricalTransactionsForUser(
      userId,
      (message) => {
        report({
          phase: "preparing",
          message,
          itemsDone: 0,
          itemsTotal: items.length,
          pagesDone: 0,
          transactionsProcessed: 0,
          percent: 6,
        });
      },
    );

    if (backfill.errors.length > 0) {
      console.warn("Historical backfill warnings:", backfill.errors);
    }

    let added = backfill.imported;
    let modified = 0;
    let removed = 0;
    let itemsDone = 0;
    const itemsTotal = items.length;

    for (const item of items) {
      let pagesDone = 0;
      report({
        phase: "syncing_item",
        message: `Syncing ${item.institutionName}…`,
        itemsDone,
        itemsTotal,
        pagesDone: 0,
        transactionsProcessed: added + modified + removed,
      });

      const result = await syncItemTransactions(
        userId,
        item,
        accountByPlaidId,
        rulesCache,
        (pages, hasMore, processed) => {
          pagesDone = pages;
          report({
            phase: "processing_page",
            message: hasMore
              ? `Importing transactions from ${item.institutionName} (page ${pages})…`
              : `Finished ${item.institutionName}`,
            itemsDone,
            itemsTotal,
            pagesDone,
            transactionsProcessed: processed,
          });
        },
      );
      added += result.added;
      modified += result.modified;
      removed += result.removed;
      itemsDone += 1;
    }

    report({
      phase: "subscriptions",
      message: "Detecting subscriptions…",
      itemsDone: itemsTotal,
      itemsTotal,
      pagesDone: 0,
      transactionsProcessed: added + modified + removed,
      percent: 92,
    });

    try {
      const { detectSubscriptionsForUser } = await import(
        "@/lib/subscription-detection"
      );
      await detectSubscriptionsForUser(userId);
    } catch (subError) {
      console.error("Subscription detection failed:", subError);
    }

    report({
      phase: "done",
      message: `Sync complete — ${added} new, ${modified} updated`,
      itemsDone: itemsTotal,
      itemsTotal,
      pagesDone: 0,
      transactionsProcessed: added + modified + removed,
      percent: 100,
    });

    return { added, modified, removed, itemsSynced: items.length };
  } catch (error) {
    const message = getPlaidErrorMessage(error);
    report({
      phase: "error",
      message,
      itemsDone: 0,
      itemsTotal: 0,
      pagesDone: 0,
      transactionsProcessed: 0,
      percent: 0,
    });
    return { error: message };
  }
}

export function serializeTransaction(
  row: typeof transactions.$inferSelect & {
    tagIds?: string[];
    categoryLabel?: string | null;
    categoryIcon?: string | null;
  },
) {
  return {
    id: row.id,
    financialAccountId: row.financialAccountId,
    plaidTransactionId: row.plaidTransactionId,
    date: row.date,
    authorizedDate: row.authorizedDate,
    amount: parseBalance(row.amount),
    name: row.name,
    merchantName: row.merchantName,
    merchantKey: getMerchantKey(row.merchantName, row.name),
    pending: row.pending,
    userCategoryId: row.userCategoryId,
    categoryLabel: row.categoryLabel ?? null,
    categoryIcon: row.categoryIcon ?? null,
    includeInBudget: row.includeInBudget,
    note: row.note,
    isTransfer: row.isTransfer,
    reviewStatus: row.reviewStatus,
    tagIds: row.tagIds ?? [],
  };
}
