import {
  getFinancialAccountGroup,
  getManualAssetGroup,
  parseBalance,
  type FinancialAccountRow,
  type ManualAssetRow,
} from "@/lib/account-groups";
import { getTodayDateString } from "@/lib/dates";
import {
  addManualAssetsToTotals,
  manualAssetsForSnapshotDate,
} from "@/lib/manual-asset-history";
import { db } from "@/lib/db";
import {
  balanceSnapshots,
  financialAccounts,
  manualAssets,
  plaidItems,
} from "@/drizzle/schema";
import { getPlaidErrorMessage, plaidClient } from "@/lib/plaid";
import { type SnapshotData } from "@/lib/snapshots";
import { and, eq, gte, lte } from "drizzle-orm";
import type { Transaction } from "plaid";

const BACKFILL_YEARS = 2;
const TRANSACTION_PAGE_SIZE = 500;
const INSERT_BATCH_SIZE = 50;

const RECONSTRUCTION_NOTE =
  "Reconstructed from Plaid transaction history. Investment balances reflect cash flows only, not market gains or losses.";

export type BackfillHistoryResult = {
  startDate: string;
  endDate: string;
  transactionsFetched: number;
  daysProcessed: number;
  inserted: number;
  skippedExisting: number;
};

type AccountContext = {
  row: FinancialAccountRow;
  plaidAccountId: string;
  isInvestment: boolean;
};

function getBackfillStartDate(endDate: string): string {
  const end = new Date(`${endDate}T12:00:00.000Z`);
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - BACKFILL_YEARS);
  return getTodayDateString(start);
}

function listDatesInclusive(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T12:00:00.000Z`);
  const end = new Date(`${endDate}T12:00:00.000Z`);

  while (current <= end) {
    dates.push(getTodayDateString(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function isInvestmentAccount(type: string, subtype: string | null): boolean {
  return (
    type === "investment" ||
    type === "brokerage" ||
    subtype?.toLowerCase().includes("investment") === true ||
    subtype?.toLowerCase().includes("brokerage") === true
  );
}

async function fetchAllTransactions(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<Transaction[]> {
  const all: Transaction[] = [];
  let offset = 0;
  let total = 0;

  do {
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        offset,
        count: TRANSACTION_PAGE_SIZE,
      },
    });

    const page = response.data.transactions;
    total = response.data.total_transactions;
    all.push(...page);
    offset += page.length;

    if (page.length === 0) {
      break;
    }
  } while (offset < total);

  return all;
}

function sumTransactionAmounts(transactions: Transaction[]): number {
  return transactions.reduce((sum, txn) => sum + txn.amount, 0);
}

/**
 * Reconstruct end-of-day balances by walking backward from today's balance.
 * Plaid: positive amount = outflow, negative = inflow.
 * B_prev = B_next + sum(amount on the day after prev).
 */
function reconstructDailyBalances(
  account: AccountContext,
  transactions: Transaction[],
  startDate: string,
  endDate: string,
): Map<string, number> {
  const balances = new Map<string, number>();
  const byDate = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    if (txn.account_id !== account.plaidAccountId) {
      continue;
    }

    const bucket = byDate.get(txn.date) ?? [];
    bucket.push(txn);
    byDate.set(txn.date, bucket);
  }

  const dates = listDatesInclusive(startDate, endDate);
  const todayBalance = parseBalance(account.row.currentBalance);
  balances.set(endDate, todayBalance);

  for (let index = dates.length - 2; index >= 0; index--) {
    const day = dates[index]!;
    const nextDay = dates[index + 1]!;
    const nextBalance = balances.get(nextDay) ?? todayBalance;
    const txOnNextDay = byDate.get(nextDay) ?? [];
    balances.set(day, nextBalance + sumTransactionAmounts(txOnNextDay));
  }

  return balances;
}

function aggregatePortfolioTotals(
  accountBalances: Array<{
    row: FinancialAccountRow;
    balance: number;
  }>,
  manualRows: ManualAssetRow[],
  date: string,
  today: string,
): {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
} {
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const { row, balance } of accountBalances) {
    const group = getFinancialAccountGroup(row.type, row.subtype);
    if (group === "Liabilities") {
      totalLiabilities += Math.abs(balance);
    } else {
      totalAssets += balance;
    }
  }

  return addManualAssetsToTotals(
    manualRows,
    date,
    { totalAssets, totalLiabilities },
    today,
  );
}

function buildReconstructedSnapshotData(
  accountBalances: Array<{
    row: FinancialAccountRow;
    balance: number;
    isInvestment: boolean;
  }>,
  manualRows: ManualAssetRow[],
  date: string,
  today: string,
): SnapshotData {
  return {
    computedAt: new Date().toISOString(),
    source: "reconstructed",
    reconstructionNote: RECONSTRUCTION_NOTE,
    groups: [],
    financialAccounts: accountBalances.map(({ row, balance, isInvestment }) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      subtype: row.subtype,
      group: getFinancialAccountGroup(row.type, row.subtype),
      balance,
      currency: row.currency,
      snapshotSource: "reconstructed" as const,
      isInvestmentAccount: isInvestment,
    })),
    manualAssets: manualAssetsForSnapshotDate(
      manualRows,
      date,
      "reconstructed",
      today,
    ),
  };
}

export async function backfillUserBalanceHistory(
  userId: string,
): Promise<BackfillHistoryResult> {
  const endDate = getTodayDateString();
  const startDate = getBackfillStartDate(endDate);

  const [items, plaidAccountRows, manualRows, existingSnapshots] =
    await Promise.all([
      db.query.plaidItems.findMany({
        where: eq(plaidItems.userId, userId),
      }),
      db.query.financialAccounts.findMany({
        where: eq(financialAccounts.userId, userId),
      }),
      db.query.manualAssets.findMany({
        where: eq(manualAssets.userId, userId),
      }),
      db
        .select({ date: balanceSnapshots.date })
        .from(balanceSnapshots)
        .where(
          and(
            eq(balanceSnapshots.userId, userId),
            gte(balanceSnapshots.date, startDate),
            lte(balanceSnapshots.date, endDate),
          ),
        ),
    ]);

  const existingDates = new Set(existingSnapshots.map((row) => row.date));
  const dates = listDatesInclusive(startDate, endDate);
  const today = endDate;

  const accountContexts: AccountContext[] = plaidAccountRows
    .filter((row) => row.plaidAccountId)
    .map((row) => ({
      row,
      plaidAccountId: row.plaidAccountId!,
      isInvestment: isInvestmentAccount(row.type, row.subtype),
    }));

  const unlinkedPlaidAccounts = plaidAccountRows.filter(
    (row) => !row.plaidAccountId,
  );

  const allTransactions: Transaction[] = [];

  for (const item of items) {
    const txns = await fetchAllTransactions(
      item.accessToken,
      startDate,
      endDate,
    );
    allTransactions.push(...txns);
  }

  const balanceByAccountAndDate = new Map<string, Map<string, number>>();

  for (const account of accountContexts) {
    balanceByAccountAndDate.set(
      account.row.id,
      reconstructDailyBalances(
        account,
        allTransactions,
        startDate,
        endDate,
      ),
    );
  }

  const rowsToInsert: Array<{
    userId: string;
    date: string;
    totalAssets: string;
    totalLiabilities: string;
    netWorth: string;
    snapshotData: SnapshotData;
  }> = [];

  let skippedExisting = 0;

  for (const date of dates) {
    if (existingDates.has(date)) {
      skippedExisting += 1;
      continue;
    }

    const accountBalances = [
      ...accountContexts.map((account) => {
        const history =
          balanceByAccountAndDate.get(account.row.id) ??
          new Map<string, number>();
        return {
          row: account.row,
          balance:
            history.get(date) ?? parseBalance(account.row.currentBalance),
          isInvestment: account.isInvestment,
        };
      }),
      ...unlinkedPlaidAccounts.map((row) => ({
        row,
        balance: parseBalance(row.currentBalance),
        isInvestment: isInvestmentAccount(row.type, row.subtype),
      })),
    ];

    const totals = aggregatePortfolioTotals(
      accountBalances,
      manualRows,
      date,
      today,
    );

    rowsToInsert.push({
      userId,
      date,
      totalAssets: totals.totalAssets.toFixed(4),
      totalLiabilities: totals.totalLiabilities.toFixed(4),
      netWorth: totals.netWorth.toFixed(4),
      snapshotData: buildReconstructedSnapshotData(
        accountBalances,
        manualRows,
        date,
        today,
      ),
    });
  }

  for (let index = 0; index < rowsToInsert.length; index += INSERT_BATCH_SIZE) {
    const batch = rowsToInsert.slice(index, index + INSERT_BATCH_SIZE);
    if (batch.length > 0) {
      await db.insert(balanceSnapshots).values(batch);
    }
  }

  return {
    startDate,
    endDate,
    transactionsFetched: allTransactions.length,
    daysProcessed: dates.length,
    inserted: rowsToInsert.length,
    skippedExisting,
  };
}

export async function backfillUserBalanceHistorySafe(
  userId: string,
): Promise<BackfillHistoryResult | { error: string }> {
  try {
    return await backfillUserBalanceHistory(userId);
  } catch (error) {
    return { error: getPlaidErrorMessage(error) };
  }
}
