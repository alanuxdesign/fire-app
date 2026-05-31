import {
  buildAccountsResponse,
  getManualAssetGroup,
  parseBalance,
  type AccountGroupType,
  type AccountsApiResponse,
} from "@/lib/account-groups";
import {
  balanceSnapshots,
  financialAccounts,
  manualAssets,
  users,
} from "@/drizzle/schema";
import { db } from "@/lib/db";
import { getTodayDateString } from "@/lib/dates";
import {
  earliestManualSnapshotDate,
  manualAssetValueFromListItem,
  manualAssetValueFromRow,
  manualAssetsNetWorth,
  totalsFromSnapshotFinancials,
} from "@/lib/manual-asset-history";
import { toDateString } from "@/lib/purchase-date";
import { getInstitutionNamesForUser } from "@/lib/plaid-accounts";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";

export type SnapshotRange = "1M" | "3M" | "6M" | "1Y" | "YTD" | "ALL";

export type SnapshotSummary = {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  source?: SnapshotSource;
};

export type SnapshotSource = "live" | "reconstructed";

export type SnapshotData = {
  computedAt: string;
  source: SnapshotSource;
  reconstructionNote?: string;
  groups: AccountsApiResponse["groups"];
  financialAccounts: Array<{
    id: string;
    name: string;
    type: string;
    subtype: string | null;
    group: string;
    balance: number;
    currency: string;
    snapshotSource?: SnapshotSource;
    isInvestmentAccount?: boolean;
  }>;
  manualAssets: Array<{
    id: string;
    name: string;
    assetType: string;
    group: string;
    value: number;
    snapshotSource?: SnapshotSource;
  }>;
};

export { getTodayDateString } from "@/lib/dates";

export function parseSnapshotRange(
  value: string | null,
): SnapshotRange {
  const ranges: SnapshotRange[] = ["1M", "3M", "6M", "1Y", "YTD", "ALL"];
  if (value && ranges.includes(value as SnapshotRange)) {
    return value as SnapshotRange;
  }
  return "1Y";
}

function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

export function getRangeStartDate(
  range: SnapshotRange,
  now = new Date(),
): string | null {
  if (range === "ALL") {
    return null;
  }

  if (range === "YTD") {
    return `${now.getFullYear()}-01-01`;
  }

  const months =
    range === "1M" ? 1 : range === "3M" ? 3 : range === "6M" ? 6 : 12;

  return getTodayDateString(subtractMonths(now, months));
}

export async function loadUserBalances(userId: string) {
  const [financialRows, manualRows, institutionNames] = await Promise.all([
    db.query.financialAccounts.findMany({
      where: eq(financialAccounts.userId, userId),
    }),
    db.query.manualAssets.findMany({
      where: eq(manualAssets.userId, userId),
    }),
    getInstitutionNamesForUser(userId),
  ]);

  return buildAccountsResponse(financialRows, manualRows, institutionNames);
}

export function buildSnapshotData(
  accounts: AccountsApiResponse,
  asOfDate: string = getTodayDateString(),
): SnapshotData {
  const today = getTodayDateString();

  const financialAccountsList = accounts.groups.flatMap((group) =>
    group.accounts
      .filter((account) => !account.isManual)
      .map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        subtype: account.subtitle,
        group: group.type,
        balance: account.currentBalance,
        currency: account.currency,
      })),
  );

  const manualAssetsList = accounts.groups.flatMap((group) =>
    group.accounts
      .filter((account) => account.isManual)
      .map((account) => ({
        id: account.id,
        name: account.name,
        assetType: account.type,
        group: group.type,
        value: manualAssetValueFromListItem(account, asOfDate, today),
      }))
      .filter((asset) => asset.value > 0),
  );

  return {
    computedAt: new Date().toISOString(),
    source: "live",
    groups: accounts.groups,
    financialAccounts: financialAccountsList.map((account) => ({
      ...account,
      snapshotSource: "live" as const,
    })),
    manualAssets: manualAssetsList.map((asset) => ({
      ...asset,
      snapshotSource: "live" as const,
    })),
  };
}

export async function getSnapshotForDate(userId: string, date: string) {
  return db.query.balanceSnapshots.findFirst({
    where: and(
      eq(balanceSnapshots.userId, userId),
      eq(balanceSnapshots.date, date),
    ),
  });
}

export async function getSnapshotOnOrBefore(userId: string, date: string) {
  const exact = await getSnapshotForDate(userId, date);
  if (exact) {
    return exact;
  }

  const [row] = await db
    .select()
    .from(balanceSnapshots)
    .where(
      and(
        eq(balanceSnapshots.userId, userId),
        lte(balanceSnapshots.date, date),
      ),
    )
    .orderBy(desc(balanceSnapshots.date))
    .limit(1);

  return row ?? null;
}

export async function createBalanceSnapshot(
  userId: string,
  date = getTodayDateString(),
) {
  const accounts = await loadUserBalances(userId);
  const snapshotData = buildSnapshotData(accounts);

  const [snapshot] = await db
    .insert(balanceSnapshots)
    .values({
      userId,
      date,
      totalAssets: String(accounts.totalAssets),
      totalLiabilities: String(accounts.totalLiabilities),
      netWorth: String(accounts.netWorth),
      snapshotData,
    })
    .returning();

  return {
    created: true as const,
    snapshot: {
      id: snapshot.id,
      date: snapshot.date,
      totalAssets: parseBalance(snapshot.totalAssets),
      totalLiabilities: parseBalance(snapshot.totalLiabilities),
      netWorth: parseBalance(snapshot.netWorth),
    },
  };
}

/** Insert or refresh today's snapshot so totals match live balances. */
export async function upsertTodaySnapshot(userId: string) {
  const today = getTodayDateString();
  const accounts = await loadUserBalances(userId);
  const snapshotData = buildSnapshotData(accounts, today);
  const existing = await getSnapshotForDate(userId, today);

  const values = {
    totalAssets: String(accounts.totalAssets),
    totalLiabilities: String(accounts.totalLiabilities),
    netWorth: String(accounts.netWorth),
    snapshotData,
  };

  if (existing) {
    const [snapshot] = await db
      .update(balanceSnapshots)
      .set(values)
      .where(
        and(
          eq(balanceSnapshots.userId, userId),
          eq(balanceSnapshots.date, today),
        ),
      )
      .returning();

    return {
      created: false as const,
      updated: true as const,
      snapshot: {
        id: snapshot.id,
        date: snapshot.date,
        totalAssets: parseBalance(snapshot.totalAssets),
        totalLiabilities: parseBalance(snapshot.totalLiabilities),
        netWorth: parseBalance(snapshot.netWorth),
      },
    };
  }

  const created = await createBalanceSnapshot(userId, today);
  return { ...created, updated: false as const };
}

export async function createSnapshotIfNeeded(userId: string) {
  return upsertTodaySnapshot(userId);
}

export async function snapshotAllUsers() {
  const allUsers = await db.select({ id: users.id }).from(users);

  let created = 0;
  let skipped = 0;
  const results = [];

  for (const user of allUsers) {
    const result = await createSnapshotIfNeeded(user.id);
    if (result.created) {
      created += 1;
    } else {
      skipped += 1;
    }
    results.push({ userId: user.id, ...result });
  }

  return {
    processed: allUsers.length,
    created,
    skipped,
    results,
  };
}

export async function refreshSnapshotsForManualAssets(
  userId: string,
  options?: { fromDate?: string | null },
) {
  const today = getTodayDateString();
  const manualRows = await db.query.manualAssets.findMany({
    where: eq(manualAssets.userId, userId),
  });

  if (manualRows.length === 0) {
    return { updated: 0 };
  }

  const startDate =
    toDateString(options?.fromDate) ??
    earliestManualSnapshotDate(manualRows, today);

  const rows = await db.query.balanceSnapshots.findMany({
    where: and(
      eq(balanceSnapshots.userId, userId),
      gte(balanceSnapshots.date, startDate),
      lte(balanceSnapshots.date, today),
    ),
    orderBy: [asc(balanceSnapshots.date)],
  });

  let updated = 0;

  for (const row of rows) {
    const data = row.snapshotData as SnapshotData | null | undefined;
    const snapshotDate = toDateString(row.date) ?? row.date;

    if (data?.financialAccounts) {
      const totals = totalsFromSnapshotFinancials(
        data,
        manualRows,
        snapshotDate,
        today,
      );

      await db
        .update(balanceSnapshots)
        .set({
          totalAssets: totals.totalAssets.toFixed(4),
          totalLiabilities: totals.totalLiabilities.toFixed(4),
          netWorth: totals.netWorth.toFixed(4),
          snapshotData: {
            ...data,
            manualAssets: totals.manualAssets,
          },
        })
        .where(
          and(
            eq(balanceSnapshots.userId, userId),
            eq(balanceSnapshots.date, row.date),
          ),
        );

      updated += 1;
      continue;
    }

    const manualNet = manualAssetsNetWorth(manualRows, snapshotDate, today);
    const storedNet = parseBalance(row.netWorth);
    const storedAssets = parseBalance(row.totalAssets);
    const storedLiabilities = parseBalance(row.totalLiabilities);
    let manualAssets = 0;
    let manualLiabilities = 0;

    for (const manual of manualRows) {
      const value = manualAssetValueFromRow(manual, snapshotDate, today);
      if (value === 0) {
        continue;
      }
      const group = getManualAssetGroup(manual.assetType);
      if (group === "Liabilities") {
        manualLiabilities += Math.abs(value);
      } else {
        manualAssets += value;
      }
    }

    await db
      .update(balanceSnapshots)
      .set({
        totalAssets: (storedAssets + manualAssets).toFixed(4),
        totalLiabilities: (storedLiabilities + manualLiabilities).toFixed(4),
        netWorth: (storedNet + manualNet).toFixed(4),
      })
      .where(
        and(
          eq(balanceSnapshots.userId, userId),
          eq(balanceSnapshots.date, row.date),
        ),
      );

    updated += 1;
  }

  return { updated };
}

export async function getSnapshotsForUser(
  userId: string,
  range: SnapshotRange,
): Promise<SnapshotSummary[]> {
  const startDate = getRangeStartDate(range);
  const today = getTodayDateString();

  const [rows, manualRows] = await Promise.all([
    db.query.balanceSnapshots.findMany({
      where: startDate
        ? and(
            eq(balanceSnapshots.userId, userId),
            gte(balanceSnapshots.date, startDate),
          )
        : eq(balanceSnapshots.userId, userId),
      orderBy: [asc(balanceSnapshots.date)],
    }),
    db.query.manualAssets.findMany({
      where: eq(manualAssets.userId, userId),
    }),
  ]);

  return rows.map((row) => {
    const data = row.snapshotData as SnapshotData | null | undefined;
    const snapshotDate = toDateString(row.date) ?? row.date;

    if (manualRows.length > 0) {
      if (data?.financialAccounts) {
        const totals = totalsFromSnapshotFinancials(
          data,
          manualRows,
          snapshotDate,
          today,
        );

        return {
          date: snapshotDate,
          totalAssets: totals.totalAssets,
          totalLiabilities: totals.totalLiabilities,
          netWorth: totals.netWorth,
          source: data.source,
        };
      }

      const manualNet = manualAssetsNetWorth(manualRows, snapshotDate, today);

      return {
        date: snapshotDate,
        totalAssets: parseBalance(row.totalAssets),
        totalLiabilities: parseBalance(row.totalLiabilities),
        netWorth: parseBalance(row.netWorth) + manualNet,
        source: data?.source,
      };
    }

    return {
      date: snapshotDate,
      totalAssets: parseBalance(row.totalAssets),
      totalLiabilities: parseBalance(row.totalLiabilities),
      netWorth: parseBalance(row.netWorth),
      source: data?.source,
    };
  });
}

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}
