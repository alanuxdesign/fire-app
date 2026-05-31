import {
  buildAccountsResponse,
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
import { getInstitutionNamesForUser } from "@/lib/plaid-accounts";
import { and, asc, eq, gte } from "drizzle-orm";

export type SnapshotRange = "1M" | "3M" | "6M" | "1Y" | "YTD" | "ALL";

export type SnapshotSummary = {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
};

export type SnapshotData = {
  computedAt: string;
  groups: AccountsApiResponse["groups"];
  financialAccounts: Array<{
    id: string;
    name: string;
    type: string;
    subtype: string | null;
    group: AccountGroupType;
    balance: number;
    currency: string;
  }>;
  manualAssets: Array<{
    id: string;
    name: string;
    assetType: string;
    group: AccountGroupType;
    value: number;
  }>;
};

export function getTodayDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

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
): SnapshotData {
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
        value: account.currentBalance,
      })),
  );

  return {
    computedAt: new Date().toISOString(),
    groups: accounts.groups,
    financialAccounts: financialAccountsList,
    manualAssets: manualAssetsList,
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

export async function createSnapshotIfNeeded(userId: string) {
  const today = getTodayDateString();
  const existing = await getSnapshotForDate(userId, today);

  if (existing) {
    return {
      created: false as const,
      snapshot: {
        id: existing.id,
        date: existing.date,
        totalAssets: parseBalance(existing.totalAssets),
        totalLiabilities: parseBalance(existing.totalLiabilities),
        netWorth: parseBalance(existing.netWorth),
      },
    };
  }

  return createBalanceSnapshot(userId, today);
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

export async function getSnapshotsForUser(
  userId: string,
  range: SnapshotRange,
): Promise<SnapshotSummary[]> {
  const startDate = getRangeStartDate(range);

  const rows = await db.query.balanceSnapshots.findMany({
    where: startDate
      ? and(
          eq(balanceSnapshots.userId, userId),
          gte(balanceSnapshots.date, startDate),
        )
      : eq(balanceSnapshots.userId, userId),
    orderBy: [asc(balanceSnapshots.date)],
  });

  return rows.map((row) => ({
    date: row.date,
    totalAssets: parseBalance(row.totalAssets),
    totalLiabilities: parseBalance(row.totalLiabilities),
    netWorth: parseBalance(row.netWorth),
  }));
}

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}
