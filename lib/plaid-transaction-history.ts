import { getTodayDateString } from "@/lib/dates";
import { PLAID_TRANSACTION_HISTORY_DAYS } from "@/lib/plaid-transaction-constants";
import { upsertPlaidTransaction } from "@/lib/plaid-transaction-upsert";
import { financialAccounts, plaidItems, transactions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { getPlaidErrorMessage, plaidClient } from "@/lib/plaid";
import { and, eq, min } from "drizzle-orm";
import {
  PersonalFinanceCategoryVersion,
  type Transaction as PlaidTransaction,
} from "plaid";

const PAGE_SIZE = 500;

export function getTransactionHistoryStartDate(
  endDate = getTodayDateString(),
): string {
  const end = new Date(`${endDate}T12:00:00.000Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - PLAID_TRANSACTION_HISTORY_DAYS);
  return getTodayDateString(start);
}

async function fetchTransactionsGetPage(
  accessToken: string,
  startDate: string,
  endDate: string,
  accountIds: string[],
  offset: number,
): Promise<{ transactions: PlaidTransaction[]; total: number }> {
  const response = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
    options: {
      offset,
      count: PAGE_SIZE,
      account_ids: accountIds.length > 0 ? accountIds : undefined,
      personal_finance_category_version: PersonalFinanceCategoryVersion.V2,
    },
  });

  return {
    transactions: response.data.transactions,
    total: response.data.total_transactions,
  };
}

export async function getOldestTransactionDateForUser(
  userId: string,
): Promise<string | null> {
  const rows = await db
    .select({ oldest: min(transactions.date) })
    .from(transactions)
    .where(eq(transactions.userId, userId));
  const value = rows[0]?.oldest;
  return value ?? null;
}

export function shouldRunHistoricalBackfill(
  oldestDate: string | null,
): boolean {
  const targetStart = getTransactionHistoryStartDate();
  if (!oldestDate) return true;
  return oldestDate > targetStart;
}

export async function backfillHistoricalTransactionsForItem(
  userId: string,
  item: typeof plaidItems.$inferSelect,
  accountByPlaidId: Map<string, string>,
): Promise<{ imported: number; error?: string }> {
  const budgetPlaidAccountIds = [...accountByPlaidId.keys()];
  if (budgetPlaidAccountIds.length === 0) {
    return { imported: 0 };
  }

  const endDate = getTodayDateString();
  const startDate = getTransactionHistoryStartDate(endDate);

  try {
    let offset = 0;
    let total = 0;
    let imported = 0;

    do {
      const page = await fetchTransactionsGetPage(
        item.accessToken,
        startDate,
        endDate,
        budgetPlaidAccountIds,
        offset,
      );
      total = page.total;

      for (const txn of page.transactions) {
        const financialAccountId = accountByPlaidId.get(txn.account_id);
        if (!financialAccountId) continue;
        await upsertPlaidTransaction(userId, txn, financialAccountId, {
          preserveUserCategory: true,
        });
        imported += 1;
      }

      offset += page.transactions.length;
      if (page.transactions.length === 0) break;
    } while (offset < total);

    return { imported };
  } catch (error) {
    return { imported: 0, error: getPlaidErrorMessage(error) };
  }
}

export async function backfillHistoricalTransactionsForUser(
  userId: string,
  onMessage?: (message: string) => void,
): Promise<{ imported: number; errors: string[] }> {
  const oldest = await getOldestTransactionDateForUser(userId);
  if (!shouldRunHistoricalBackfill(oldest)) {
    return { imported: 0, errors: [] };
  }

  const items = await db.query.plaidItems.findMany({
    where: eq(plaidItems.userId, userId),
  });

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
      !["depository", "credit"].includes(account.type) ||
      account.excludeFromBudget
    ) {
      continue;
    }
    accountByPlaidId.set(account.plaidAccountId, account.id);
  }

  let imported = 0;
  const errors: string[] = [];

  for (const item of items) {
    onMessage?.(`Loading history from ${item.institutionName}…`);
    const result = await backfillHistoricalTransactionsForItem(
      userId,
      item,
      accountByPlaidId,
    );
    imported += result.imported;
    if (result.error) {
      errors.push(`${item.institutionName}: ${result.error}`);
    }
  }

  return { imported, errors };
}
