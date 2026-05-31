import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const DAY_COUNT = 365;

function addDays(dateStr: string, offset: number): string {
  const date = new Date(`${dateStr}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Daily returns with +/-0.5% noise and drift; path is affine-scaled to hit start/end net worth. */
function generateNetWorthPath(startNW: number, endNW: number): number[] {
  const returns: number[] = [];
  const drift =
    Math.pow(endNW / startNW, 1 / (DAY_COUNT - 1)) - 1;

  for (let i = 0; i < DAY_COUNT - 1; i++) {
    const noise = randomInRange(-0.005, 0.005);
    returns.push(drift + noise);
  }

  const raw: number[] = [startNW];
  for (const dailyReturn of returns) {
    raw.push(raw[raw.length - 1]! * (1 + dailyReturn));
  }

  const rawStart = raw[0]!;
  const rawEnd = raw[raw.length - 1]!;
  const span = rawEnd - rawStart;
  const scale = span === 0 ? 1 : (endNW - startNW) / span;

  return raw.map((value) => startNW + scale * (value - rawStart));
}

function generateBalanceSheet(
  netWorth: number,
  endNetWorth: number,
  endAssets: number,
  endLiabilities: number,
): { totalAssets: number; totalLiabilities: number } {
  if (endNetWorth === 0) {
    return { totalAssets: endAssets, totalLiabilities: endLiabilities };
  }

  const nwRatio = netWorth / endNetWorth;
  const liabilityNoise = randomInRange(0.98, 1.02);
  const assetNoise = randomInRange(0.98, 1.02);

  let totalLiabilities = Math.max(0, endLiabilities * nwRatio * liabilityNoise);
  let totalAssets = endAssets * nwRatio * assetNoise;

  if (totalAssets < totalLiabilities + netWorth) {
    totalAssets = totalLiabilities + netWorth;
  } else if (totalAssets > totalLiabilities + netWorth * 1.15) {
    totalLiabilities = Math.max(0, totalAssets - netWorth);
  } else {
    totalLiabilities = Math.max(0, totalAssets - netWorth);
  }

  return { totalAssets, totalLiabilities };
}

function toNumericString(value: number): string {
  return value.toFixed(4);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local");
    process.exit(1);
  }

  const { and, desc, eq, gte, lte } = await import("drizzle-orm");
  const { balanceSnapshots } = await import("@/drizzle/schema");
  const { parseBalance } = await import("@/lib/account-groups");
  const { getTodayDateString } = await import("@/lib/dates");
  const { db } = await import("@/lib/db");
  const {
    getSnapshotForDate,
    getSnapshotOnOrBefore,
    loadUserBalances,
  } = await import("@/lib/snapshots");

  const today = getTodayDateString();
  let userId = process.env.SEED_USER_ID?.trim();

  if (!userId) {
    const [latest] = await db
      .select({ userId: balanceSnapshots.userId })
      .from(balanceSnapshots)
      .orderBy(desc(balanceSnapshots.date))
      .limit(1);

    if (!latest) {
      console.error(
        "No balance snapshots found. Set SEED_USER_ID in .env.local or create a snapshot first.",
      );
      process.exit(1);
    }

    userId = latest.userId;
    console.log(`Using user ${userId} (latest snapshot in database)`);
  } else {
    console.log(`Using user ${userId} (SEED_USER_ID)`);
  }

  let endNetWorth: number;
  let endAssets: number;
  let endLiabilities: number;
  let todaySnapshotData: unknown = null;

  const todaySnapshot = await getSnapshotForDate(userId, today);
  const anchor =
    todaySnapshot ?? (await getSnapshotOnOrBefore(userId, today));

  if (anchor) {
    endNetWorth = parseBalance(anchor.netWorth);
    endAssets = parseBalance(anchor.totalAssets);
    endLiabilities = parseBalance(anchor.totalLiabilities);
    todaySnapshotData = anchor.snapshotData;
    console.log(
      `Anchor snapshot: ${anchor.date} — net worth ${endNetWorth.toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
    );
  } else {
    const accounts = await loadUserBalances(userId);
    endNetWorth = accounts.netWorth;
    endAssets = accounts.totalAssets;
    endLiabilities = accounts.totalLiabilities;
    console.log(
      `No snapshot found; using live balances — net worth ${endNetWorth.toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
    );
  }

  if (endNetWorth === 0) {
    console.error("Ending net worth cannot be zero.");
    process.exit(1);
  }

  const startFactor = randomInRange(0.6, 0.7);
  const startNetWorth =
    endNetWorth > 0
      ? endNetWorth * startFactor
      : endNetWorth / startFactor;
  const netWorthPath = generateNetWorthPath(startNetWorth, endNetWorth);

  const startDate = addDays(today, -(DAY_COUNT - 1));

  await db
    .delete(balanceSnapshots)
    .where(
      and(
        eq(balanceSnapshots.userId, userId),
        gte(balanceSnapshots.date, startDate),
        lte(balanceSnapshots.date, today),
      ),
    );

  const rows = netWorthPath.map((netWorth, index) => {
    const date = addDays(startDate, index);
    const isToday = date === today;
    const { totalAssets, totalLiabilities } = generateBalanceSheet(
      netWorth,
      endNetWorth,
      endAssets,
      endLiabilities,
    );

    return {
      userId,
      date,
      totalAssets: toNumericString(isToday ? endAssets : totalAssets),
      totalLiabilities: toNumericString(
        isToday ? endLiabilities : totalLiabilities,
      ),
      netWorth: toNumericString(isToday ? endNetWorth : netWorth),
      snapshotData: isToday ? todaySnapshotData : null,
    };
  });

  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db.insert(balanceSnapshots).values(rows.slice(i, i + BATCH_SIZE));
  }

  const yearAgoNetWorth = netWorthPath[0]!;
  const growthPct = ((endNetWorth - yearAgoNetWorth) / Math.abs(yearAgoNetWorth)) * 100;
  const growthLabel =
    growthPct >= 0 ? `+${growthPct.toFixed(1)}%` : `${growthPct.toFixed(1)}%`;

  console.log(`Inserted ${rows.length} snapshots (${startDate} → ${today})`);
  console.log(
    `Start net worth: ${yearAgoNetWorth.toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
  );
  console.log(
    `End net worth:   ${endNetWorth.toLocaleString("en-US", { style: "currency", currency: "USD" })} (${growthLabel} vs start)`,
  );

  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
