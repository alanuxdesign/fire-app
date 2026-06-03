import { requireUserId } from "@/lib/api-auth";
import { plaidItems } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/** Quick check for last sync — does not run Plaid. */
export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const items = await db.query.plaidItems.findMany({
    where: eq(plaidItems.userId, authResult.userId),
    columns: {
      id: true,
      institutionName: true,
      lastTransactionsSyncAt: true,
      transactionsCursor: true,
    },
  });

  const lastSyncAt = items.reduce<Date | null>((latest, item) => {
    if (!item.lastTransactionsSyncAt) return latest;
    if (!latest || item.lastTransactionsSyncAt > latest) {
      return item.lastTransactionsSyncAt;
    }
    return latest;
  }, null);

  return NextResponse.json({
    itemCount: items.length,
    hasSyncedBefore: items.some((i) => Boolean(i.transactionsCursor)),
    lastSyncAt: lastSyncAt?.toISOString() ?? null,
    institutions: items.map((i) => ({
      name: i.institutionName,
      lastSyncAt: i.lastTransactionsSyncAt?.toISOString() ?? null,
    })),
  });
}
