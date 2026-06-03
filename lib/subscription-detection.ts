import { parseBalance } from "@/lib/account-groups";
import { getMerchantKey } from "@/lib/merchant-key";
import {
  consolidateSubscriptionDuplicates,
  pickPreferredSubscription,
} from "@/lib/subscription-groups";
import { subscriptionGroups, transactions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, eq, gte } from "drizzle-orm";

/** Heuristic subscription detection — run after transaction sync. */
export async function detectSubscriptionsForUser(
  userId: string,
): Promise<number> {
  await consolidateSubscriptionDuplicates(userId);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      gte(transactions.date, cutoffStr),
    ),
  });

  const byMerchant = new Map<
    string,
    { amounts: number[]; dates: string[]; name: string }
  >();

  for (const row of rows) {
    if (row.isTransfer || !row.includeInBudget) continue;
    const amount = parseBalance(row.amount);
    if (amount <= 0) continue;
    const key = getMerchantKey(row.merchantName, row.name);
    const entry = byMerchant.get(key) ?? {
      amounts: [],
      dates: [],
      name: row.merchantName ?? row.name,
    };
    entry.amounts.push(amount);
    entry.dates.push(row.date);
    byMerchant.set(key, entry);
  }

  let created = 0;
  for (const [merchantKey, data] of byMerchant) {
    if (data.amounts.length < 3) continue;

    const avg =
      data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length;
    const similar = data.amounts.every(
      (a) => Math.abs(a - avg) / avg <= 0.15,
    );
    if (!similar) continue;

    const existingRows = await db.query.subscriptionGroups.findMany({
      where: and(
        eq(subscriptionGroups.userId, userId),
        eq(subscriptionGroups.merchantKey, merchantKey),
      ),
    });

    const active = existingRows.filter((r) => !r.isDismissed);
    if (active.length > 0) {
      const primary = active.reduce((best, row) =>
        pickPreferredSubscription(best, row),
      );
      await db
        .update(subscriptionGroups)
        .set({
          displayName: data.name,
          expectedAmount: String(avg),
        })
        .where(eq(subscriptionGroups.id, primary.id));

      for (const dup of active) {
        if (dup.id === primary.id) continue;
        await db
          .update(subscriptionGroups)
          .set({ isDismissed: true, isConfirmed: false })
          .where(eq(subscriptionGroups.id, dup.id));
      }
      continue;
    }

    if (existingRows.some((r) => r.isDismissed)) continue;

    await db.insert(subscriptionGroups).values({
      userId,
      merchantKey,
      displayName: data.name,
      expectedAmount: String(avg),
      cadence: "monthly",
    });
    created += 1;
  }

  return created;
}
