import { manualAssets } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { parseBalance } from "@/lib/account-groups";
import { fetchMarketPrice } from "@/lib/market-prices";
import { and, eq, isNotNull } from "drizzle-orm";

export async function refreshMarketTrackedManualAssets(userId: string) {
  const assets = await db.query.manualAssets.findMany({
    where: and(
      eq(manualAssets.userId, userId),
      isNotNull(manualAssets.marketSymbol),
    ),
  });

  const updated = [];

  for (const asset of assets) {
    const symbol = asset.marketSymbol?.trim();
    if (!symbol) {
      continue;
    }

    const price = await fetchMarketPrice(symbol);
    if (price === null) {
      continue;
    }

    const quantity = asset.marketQuantity
      ? parseBalance(asset.marketQuantity)
      : 1;
    const nextValue = price * (quantity > 0 ? quantity : 1);

    const [row] = await db
      .update(manualAssets)
      .set({
        currentValue: String(nextValue),
        updatedAt: new Date(),
      })
      .where(eq(manualAssets.id, asset.id))
      .returning();

    updated.push(row);
  }

  return updated;
}
