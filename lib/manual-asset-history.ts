import {
  getManualAssetGroup,
  parseBalance,
  type AccountListItem,
  type ManualAssetRow,
} from "@/lib/account-groups";
import { getTodayDateString } from "@/lib/dates";
import { toDateString } from "@/lib/purchase-date";
import type { SnapshotData } from "@/lib/snapshots";

export type ManualAssetValueInput = {
  currentValue: string | number;
  purchaseValue?: string | number | null;
  purchaseDate?: string | null;
};

export function manualAssetIncludedOnDate(
  purchaseDate: string | null | undefined,
  date: string,
): boolean {
  const normalized = toDateString(purchaseDate);
  if (!normalized) {
    return true;
  }
  return date >= normalized;
}

/** Value of a manual asset on a given day (0 before purchase date). */
export function manualAssetValueOnDate(
  asset: ManualAssetValueInput,
  date: string,
  today: string = getTodayDateString(),
): number {
  const purchaseDate = toDateString(asset.purchaseDate);
  if (purchaseDate && date < purchaseDate) {
    return 0;
  }

  const current = parseBalance(
    typeof asset.currentValue === "number"
      ? String(asset.currentValue)
      : asset.currentValue,
  );
  const purchase =
    asset.purchaseValue != null && asset.purchaseValue !== ""
      ? parseBalance(
          typeof asset.purchaseValue === "number"
            ? String(asset.purchaseValue)
            : asset.purchaseValue,
        )
      : current;

  if (!purchaseDate) {
    return current;
  }

  if (date >= today) {
    return current;
  }

  if (date <= purchaseDate) {
    return purchase;
  }

  const startMs = new Date(`${purchaseDate}T12:00:00.000Z`).getTime();
  const endMs = new Date(`${today}T12:00:00.000Z`).getTime();
  const atMs = new Date(`${date}T12:00:00.000Z`).getTime();

  if (endMs <= startMs) {
    return current;
  }

  const progress = (atMs - startMs) / (endMs - startMs);
  return purchase + (current - purchase) * Math.min(1, Math.max(0, progress));
}

export function manualAssetValueFromRow(
  row: ManualAssetRow,
  date: string,
  today?: string,
): number {
  return manualAssetValueOnDate(
    {
      currentValue: row.currentValue,
      purchaseValue: row.purchaseValue,
      purchaseDate: row.purchaseDate,
    },
    date,
    today,
  );
}

export function manualAssetValueFromListItem(
  account: AccountListItem,
  date: string,
  today?: string,
): number {
  return manualAssetValueOnDate(
    {
      currentValue: account.currentBalance,
      purchaseValue: account.purchaseValue,
      purchaseDate: account.purchaseDate,
    },
    date,
    today,
  );
}

export function addManualAssetsToTotals(
  manualRows: ManualAssetRow[],
  date: string,
  totals: { totalAssets: number; totalLiabilities: number },
  today?: string,
): { totalAssets: number; totalLiabilities: number; netWorth: number } {
  let totalAssets = totals.totalAssets;
  let totalLiabilities = totals.totalLiabilities;

  for (const manual of manualRows) {
    const value = manualAssetValueFromRow(manual, date, today);
    if (value === 0) {
      continue;
    }

    const group = getManualAssetGroup(manual.assetType);
    if (group === "Liabilities") {
      totalLiabilities += Math.abs(value);
    } else {
      totalAssets += value;
    }
  }

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  };
}

export function manualAssetsForSnapshotDate(
  manualRows: ManualAssetRow[],
  date: string,
  source: SnapshotData["source"],
  today?: string,
): SnapshotData["manualAssets"] {
  return manualRows
    .map((row) => ({
      id: row.id,
      name: row.name,
      assetType: row.assetType,
      group: getManualAssetGroup(row.assetType),
      value: manualAssetValueFromRow(row, date, today),
      snapshotSource: source,
    }))
    .filter((asset) => asset.value > 0);
}

export function totalsFromSnapshotFinancials(
  data: SnapshotData,
  manualRows: ManualAssetRow[],
  date: string,
  today?: string,
): {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  manualAssets: SnapshotData["manualAssets"];
} {
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const account of data.financialAccounts) {
    if (account.group === "Liabilities") {
      totalLiabilities += Math.abs(account.balance);
    } else {
      totalAssets += account.balance;
    }
  }

  const manualAssets = manualAssetsForSnapshotDate(
    manualRows,
    date,
    data.source,
    today,
  );

  for (const asset of manualAssets) {
    if (asset.group === "Liabilities") {
      totalLiabilities += Math.abs(asset.value);
    } else {
      totalAssets += asset.value;
    }
  }

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    manualAssets,
  };
}

/** Net worth contribution from manual assets only (assets − liabilities). */
export function manualAssetsNetWorth(
  manualRows: ManualAssetRow[],
  date: string,
  today?: string,
): number {
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const row of manualRows) {
    const value = manualAssetValueFromRow(row, date, today);
    if (value === 0) {
      continue;
    }

    const group = getManualAssetGroup(row.assetType);
    if (group === "Liabilities") {
      totalLiabilities += Math.abs(value);
    } else {
      totalAssets += value;
    }
  }

  return totalAssets - totalLiabilities;
}

export function earliestManualSnapshotDate(
  manualRows: ManualAssetRow[],
  fallback: string,
): string {
  const dates = manualRows
    .map((row) => toDateString(row.purchaseDate))
    .filter((date): date is string => Boolean(date));

  if (dates.length === 0) {
    return fallback;
  }

  return dates.sort()[0]!;
}
