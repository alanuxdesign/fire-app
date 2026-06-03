import { requireUserId } from "@/lib/api-auth";
import {
  balancesFromSnapshotRow,
  enrichAccountsWithChanges,
  getMonthStartDateString,
  getYesterdayDateString,
} from "@/lib/account-changes";
import { buildAccountsResponse } from "@/lib/account-groups";
import { financialAccounts, manualAssets } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { getPlaidInstitutionsForUser } from "@/lib/plaid-accounts";
import {
  getSnapshotOnOrBefore,
} from "@/lib/snapshots";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const [financialRows, manualRows, institutions] = await Promise.all([
      db.query.financialAccounts.findMany({
        where: eq(financialAccounts.userId, authResult.userId),
      }),
      db.query.manualAssets.findMany({
        where: eq(manualAssets.userId, authResult.userId),
      }),
      getPlaidInstitutionsForUser(authResult.userId),
    ]);

    const response = buildAccountsResponse(
      financialRows,
      manualRows,
      institutions,
    );

    const [yesterdaySnapshot, monthStartSnapshot] = await Promise.all([
      getSnapshotOnOrBefore(authResult.userId, getYesterdayDateString()),
      getSnapshotOnOrBefore(authResult.userId, getMonthStartDateString()),
    ]);

    const enriched = enrichAccountsWithChanges(
      response,
      balancesFromSnapshotRow(yesterdaySnapshot),
      balancesFromSnapshotRow(monthStartSnapshot),
    );

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load accounts",
      },
      { status: 500 },
    );
  }
}
