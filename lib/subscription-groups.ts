import { subscriptionGroups } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, eq } from "drizzle-orm";

export type SubscriptionGroupRow = typeof subscriptionGroups.$inferSelect;

export function pickPreferredSubscription(
  a: SubscriptionGroupRow,
  b: SubscriptionGroupRow,
): SubscriptionGroupRow {
  if (a.isDismissed !== b.isDismissed) {
    return a.isDismissed ? b : a;
  }
  if (a.isConfirmed !== b.isConfirmed) {
    return a.isConfirmed ? a : b;
  }
  if (a.createdAt.getTime() !== b.createdAt.getTime()) {
    return a.createdAt < b.createdAt ? a : b;
  }
  return a.id < b.id ? a : b;
}

/** One active row per merchantKey for API responses. */
export function dedupeSubscriptionGroups(
  rows: SubscriptionGroupRow[],
): SubscriptionGroupRow[] {
  const byKey = new Map<string, SubscriptionGroupRow>();

  for (const row of rows) {
    if (row.isDismissed) continue;
    const existing = byKey.get(row.merchantKey);
    byKey.set(
      row.merchantKey,
      existing ? pickPreferredSubscription(row, existing) : row,
    );
  }

  return [...byKey.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: "base",
    }),
  );
}

/** Soft-dismiss duplicate rows so detection and UI stay in sync. */
export async function consolidateSubscriptionDuplicates(
  userId: string,
): Promise<number> {
  const rows = await db.query.subscriptionGroups.findMany({
    where: eq(subscriptionGroups.userId, userId),
  });

  const byKey = new Map<string, SubscriptionGroupRow[]>();
  for (const row of rows) {
    const list = byKey.get(row.merchantKey) ?? [];
    list.push(row);
    byKey.set(row.merchantKey, list);
  }

  let dismissed = 0;

  for (const group of byKey.values()) {
    if (group.length <= 1) continue;

    const active = group.filter((r) => !r.isDismissed);
    if (active.length <= 1) continue;

    let keep = active[0];
    for (let i = 1; i < active.length; i++) {
      keep = pickPreferredSubscription(keep, active[i]);
    }

    for (const row of active) {
      if (row.id === keep.id) continue;
      await db
        .update(subscriptionGroups)
        .set({ isDismissed: true, isConfirmed: false })
        .where(eq(subscriptionGroups.id, row.id));
      dismissed += 1;
    }
  }

  return dismissed;
}
