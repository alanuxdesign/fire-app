import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

import { DEMO_EMAIL } from "../lib/demo";

const DAY_COUNT = 730;

const DEMO_FINANCIAL_ACCOUNTS = [
  {
    name: "Chase Checking",
    type: "depository",
    subtype: "checking",
    balance: 12450,
    assetClass: "Cash",
  },
  {
    name: "Ally Savings",
    type: "depository",
    subtype: "savings",
    balance: 45200,
    assetClass: "Cash",
  },
  {
    name: "Fidelity 401k",
    type: "investment",
    subtype: "401k",
    balance: 185600,
    assetClass: "Domestic Equity",
  },
  {
    name: "Schwab Brokerage",
    type: "investment",
    subtype: "brokerage",
    balance: 92300,
    assetClass: "Domestic Equity",
  },
  {
    name: "Schwab Roth IRA",
    type: "investment",
    subtype: "roth",
    balance: 67800,
    assetClass: "Domestic Equity",
  },
  {
    name: "Merrill Edge IRA",
    type: "investment",
    subtype: "ira",
    balance: 43500,
    assetClass: "Int'l Equity",
  },
  {
    name: "Health Equity HSA",
    type: "investment",
    subtype: "hsa",
    balance: 18900,
    assetClass: "Cash",
  },
  {
    name: "Marcus Savings",
    type: "depository",
    subtype: "savings",
    balance: 25000,
    assetClass: "Cash",
  },
] as const;

const DEMO_MANUAL_ASSET = {
  name: "Primary Residence",
  assetType: "real_estate" as const,
  currentValue: 650000,
  purchaseValue: 520000,
  purchaseDate: "2018-08-15",
};

function addDays(dateStr: string, offset: number): string {
  const date = new Date(`${dateStr}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function generateNetWorthPath(startNW: number, endNW: number): number[] {
  const returns: number[] = [];
  const drift = Math.pow(endNW / startNW, 1 / (DAY_COUNT - 1)) - 1;

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

  const { eq } = await import("drizzle-orm");
  const {
    balanceSnapshots,
    financialAccounts,
    manualAssets,
    users,
  } = await import("@/drizzle/schema");
  const { db } = await import("@/lib/db");
  const { getTodayDateString } = await import("@/lib/dates");
  const {
    buildSnapshotData,
    loadUserBalances,
  } = await import("@/lib/snapshots");

  const today = getTodayDateString();

  let [demoUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEMO_EMAIL))
    .limit(1);

  if (!demoUser) {
    [demoUser] = await db
      .insert(users)
      .values({
        name: "Demo User",
        email: DEMO_EMAIL,
        emailVerified: new Date(),
      })
      .returning();
    console.log(`Created demo user ${demoUser!.id}`);
  } else {
    await db
      .update(users)
      .set({ name: "Demo User" })
      .where(eq(users.id, demoUser.id));
    console.log(`Using demo user ${demoUser.id}`);
  }

  const userId = demoUser!.id;

  await db.delete(balanceSnapshots).where(eq(balanceSnapshots.userId, userId));
  await db.delete(financialAccounts).where(eq(financialAccounts.userId, userId));
  await db.delete(manualAssets).where(eq(manualAssets.userId, userId));

  await db.insert(financialAccounts).values(
    DEMO_FINANCIAL_ACCOUNTS.map((account) => ({
      userId,
      name: account.name,
      type: account.type,
      subtype: account.subtype,
      currentBalance: String(account.balance),
      availableBalance: String(account.balance),
      currency: "USD",
      isManual: false,
      assetClass: account.assetClass,
    })),
  );

  await db.insert(manualAssets).values({
    userId,
    name: DEMO_MANUAL_ASSET.name,
    assetType: DEMO_MANUAL_ASSET.assetType,
    currentValue: String(DEMO_MANUAL_ASSET.currentValue),
    purchaseValue: String(DEMO_MANUAL_ASSET.purchaseValue),
    purchaseDate: DEMO_MANUAL_ASSET.purchaseDate,
  });

  const accounts = await loadUserBalances(userId);
  const endNetWorth = accounts.netWorth;
  const endAssets = accounts.totalAssets;
  const endLiabilities = accounts.totalLiabilities;
  const todaySnapshotData = buildSnapshotData(accounts, today);

  console.log(
    `Live net worth: ${endNetWorth.toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
  );

  if (endNetWorth === 0) {
    console.error("Demo net worth cannot be zero.");
    process.exit(1);
  }

  const startFactor = randomInRange(0.72, 0.78);
  const startNetWorth = endNetWorth * startFactor;
  const netWorthPath = generateNetWorthPath(startNetWorth, endNetWorth);
  const startDate = addDays(today, -(DAY_COUNT - 1));

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

  const pathStart = netWorthPath[0]!;
  const growthPct =
    ((endNetWorth - pathStart) / Math.abs(pathStart)) * 100;
  const growthLabel =
    growthPct >= 0 ? `+${growthPct.toFixed(1)}%` : `${growthPct.toFixed(1)}%`;

  console.log(`Inserted ${rows.length} snapshots (${startDate} → ${today})`);
  console.log(
    `Start net worth: ${pathStart.toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
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
