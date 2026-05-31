import { requireUserId } from "@/lib/api-auth";
import { plaidItems } from "@/drizzle/schema";
import { db } from "@/lib/db";
import {
  serializeFinancialAccount,
  syncPlaidItemAccounts,
} from "@/lib/plaid-accounts";
import { getPlaidErrorMessage } from "@/lib/plaid";
import { createSnapshotIfNeeded } from "@/lib/snapshots";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST() {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const items = await db.query.plaidItems.findMany({
      where: eq(plaidItems.userId, authResult.userId),
    });

    const accounts = [];

    for (const item of items) {
      const synced = await syncPlaidItemAccounts(
        item.id,
        item.accessToken,
        authResult.userId,
      );
      accounts.push(...synced.map(serializeFinancialAccount));
    }

    try {
      await createSnapshotIfNeeded(authResult.userId);
    } catch (snapshotError) {
      console.error("Failed to create balance snapshot after sync:", snapshotError);
    }

    return NextResponse.json({ accounts });
  } catch (error) {
    return NextResponse.json(
      { error: getPlaidErrorMessage(error) },
      { status: 500 },
    );
  }
}
