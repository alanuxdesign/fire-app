import { requireUserId } from "@/lib/api-auth";
import { plaidItems } from "@/drizzle/schema";
import { db } from "@/lib/db";
import {
  serializeFinancialAccount,
  syncPlaidItemAccounts,
} from "@/lib/plaid-accounts";
import { getPlaidErrorMessage } from "@/lib/plaid";
import { refreshMarketTrackedManualAssets } from "@/lib/market-assets";
import { createSnapshotIfNeeded } from "@/lib/snapshots";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;

  try {
    const item = await db.query.plaidItems.findFirst({
      where: and(
        eq(plaidItems.id, id),
        eq(plaidItems.userId, authResult.userId),
      ),
    });

    if (!item) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    const synced = await syncPlaidItemAccounts(
      item.id,
      item.accessToken,
      authResult.userId,
    );

    await refreshMarketTrackedManualAssets(authResult.userId).catch(
      (error) => {
        console.error("Market refresh failed:", error);
      },
    );

    await createSnapshotIfNeeded(authResult.userId).catch((error) => {
      console.error("Snapshot failed:", error);
    });

    return NextResponse.json({
      accounts: synced.map(serializeFinancialAccount),
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: getPlaidErrorMessage(error) },
      { status: 500 },
    );
  }
}
