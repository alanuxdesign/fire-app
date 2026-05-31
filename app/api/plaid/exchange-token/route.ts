import { requireUserId } from "@/lib/api-auth";
import { plaidItems } from "@/drizzle/schema";
import { db } from "@/lib/db";
import {
  type PlaidLinkMetadata,
  serializeFinancialAccount,
  syncPlaidItemAccounts,
} from "@/lib/plaid-accounts";
import { backfillUserBalanceHistorySafe } from "@/lib/plaid-backfill";
import { getPlaidErrorMessage, plaidClient } from "@/lib/plaid";
import { createSnapshotIfNeeded } from "@/lib/snapshots";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const body = (await request.json()) as {
      public_token?: string;
      metadata?: PlaidLinkMetadata;
    };

    if (!body.public_token) {
      return NextResponse.json(
        { error: "public_token is required" },
        { status: 400 },
      );
    }

    const institutionId =
      body.metadata?.institution?.institution_id ?? "unknown";
    const institutionName =
      body.metadata?.institution?.name ?? "Linked institution";

    const existingItems = await db.query.plaidItems.findMany({
      where: eq(plaidItems.userId, authResult.userId),
    });
    const isFirstPlaidConnection = existingItems.length === 0;

    const exchange = await plaidClient.itemPublicTokenExchange({
      public_token: body.public_token,
    });

    const accessToken = exchange.data.access_token;

    const [plaidItem] = await db
      .insert(plaidItems)
      .values({
        userId: authResult.userId,
        accessToken,
        institutionId,
        institutionName,
      })
      .returning();

    const accounts = await syncPlaidItemAccounts(
      plaidItem.id,
      accessToken,
      authResult.userId,
    );

    try {
      await createSnapshotIfNeeded(authResult.userId);
    } catch (snapshotError) {
      console.error(
        "Failed to create balance snapshot after exchange:",
        snapshotError,
      );
    }

    if (isFirstPlaidConnection) {
      void backfillUserBalanceHistorySafe(authResult.userId).then((result) => {
        if ("error" in result) {
          console.error("Balance history backfill failed:", result.error);
        } else {
          console.log(
            `Backfilled ${result.inserted} snapshots for user ${authResult.userId}`,
          );
        }
      });
    }

    return NextResponse.json({
      success: true,
      backfillStarted: isFirstPlaidConnection,
      accounts: accounts.map(serializeFinancialAccount),
    });
  } catch (error) {
    return NextResponse.json(
      { error: getPlaidErrorMessage(error) },
      { status: 500 },
    );
  }
}
