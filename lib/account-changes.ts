import {
  parseBalance,
  type AccountGroupResponse,
  type AccountListItem,
  type AccountsApiResponse,
} from "@/lib/account-groups";
import { manualAssetValueFromListItem } from "@/lib/manual-asset-history";
import type { SnapshotData } from "@/lib/snapshots";
import { getTodayDateString } from "@/lib/dates";

export function getYesterdayDateString(date = new Date()): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, "0");
  const day = String(yesterday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthStartDateString(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-01`;
}

function computeChange(
  current: number,
  previous: number,
): { amount: number; percent: number } {
  const amount = current - previous;
  const percent =
    previous !== 0 ? (amount / Math.abs(previous)) * 100 : 0;
  return { amount, percent };
}

function accountBalanceAtDate(
  account: AccountListItem,
  snapshotBalances: Map<string, number>,
  comparisonDate: string,
): number {
  if (account.isManual) {
    return manualAssetValueFromListItem(account, comparisonDate);
  }

  return snapshotBalances.get(account.id) ?? 0;
}

function netWorthAtDate(
  groups: AccountGroupResponse[],
  comparisonDate: string,
  snapshotBalances: Map<string, number>,
): number {
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const group of groups) {
    for (const account of group.accounts) {
      const balance = accountBalanceAtDate(
        account,
        snapshotBalances,
        comparisonDate,
      );
      if (group.type === "Liabilities") {
        totalLiabilities += Math.abs(balance);
      } else {
        totalAssets += balance;
      }
    }
  }

  return totalAssets - totalLiabilities;
}

export function extractBalancesFromSnapshot(
  snapshotData: SnapshotData | null | undefined,
): Map<string, number> {
  const balances = new Map<string, number>();

  if (!snapshotData) {
    return balances;
  }

  for (const account of snapshotData.financialAccounts) {
    balances.set(account.id, account.balance);
  }

  for (const asset of snapshotData.manualAssets) {
    balances.set(asset.id, asset.value);
  }

  return balances;
}

export function enrichAccountsWithChanges(
  response: AccountsApiResponse,
  yesterdayBalances: Map<string, number>,
  monthStartBalances: Map<string, number>,
): AccountsApiResponse {
  const yesterdayDate = getYesterdayDateString();
  const monthStartDate = getMonthStartDateString();

  const enrichedGroups: AccountGroupResponse[] = response.groups.map(
    (group) => {
      const accounts: AccountListItem[] = group.accounts.map((account) => {
        const yesterdayBalance = accountBalanceAtDate(
          account,
          yesterdayBalances,
          yesterdayDate,
        );
        const monthStartBalance = accountBalanceAtDate(
          account,
          monthStartBalances,
          monthStartDate,
        );

        const daily = computeChange(account.currentBalance, yesterdayBalance);
        const monthly = computeChange(
          account.currentBalance,
          monthStartBalance,
        );

        return {
          ...account,
          dailyChange: daily.amount,
          dailyChangePercent: daily.percent,
          monthlyChange: monthly.amount,
          monthlyChangePercent: monthly.percent,
        };
      });

      const groupMonthStartTotal = accounts.reduce((sum, account) => {
        const monthStartBalance = accountBalanceAtDate(
          account,
          monthStartBalances,
          monthStartDate,
        );
        if (group.type === "Liabilities") {
          return sum + Math.abs(monthStartBalance);
        }
        return sum + monthStartBalance;
      }, 0);

      const monthly = computeChange(group.total, groupMonthStartTotal);

      return {
        ...group,
        accounts,
        monthlyChange: monthly.amount,
        monthlyChangePercent: monthly.percent,
      };
    },
  );

  const today = getTodayDateString();
  const monthStartNetWorth = netWorthAtDate(
    response.groups,
    monthStartDate,
    monthStartBalances,
  );
  const netWorthMonthly = computeChange(response.netWorth, monthStartNetWorth);

  return {
    ...response,
    groups: enrichedGroups,
    netWorthChangeAmount: netWorthMonthly.amount,
    netWorthChangePercent: netWorthMonthly.percent,
    lastUpdated: response.lastUpdated ?? today,
  };
}

export function balancesFromSnapshotRow(
  snapshot: { snapshotData: unknown } | null | undefined,
): Map<string, number> {
  if (!snapshot?.snapshotData) {
    return new Map();
  }

  return extractBalancesFromSnapshot(snapshot.snapshotData as SnapshotData);
}
