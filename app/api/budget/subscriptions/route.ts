import { requireUserId } from "@/lib/api-auth";
import { parseBalance } from "@/lib/account-groups";
import {
  consolidateSubscriptionDuplicates,
  dedupeSubscriptionGroups,
} from "@/lib/subscription-groups";
import { subscriptionGroups } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  await consolidateSubscriptionDuplicates(authResult.userId);

  const rows = await db.query.subscriptionGroups.findMany({
    where: and(
      eq(subscriptionGroups.userId, authResult.userId),
      eq(subscriptionGroups.isDismissed, false),
    ),
  });

  const groups = dedupeSubscriptionGroups(rows);

  const subscriptions = groups.map((g) => ({
    id: g.id,
    merchantKey: g.merchantKey,
    displayName: g.displayName,
    expectedAmount: parseBalance(g.expectedAmount),
    cadence: g.cadence,
    nextExpectedDate: g.nextExpectedDate,
    isConfirmed: g.isConfirmed,
    categoryId: g.categoryId,
  }));

  const confirmed = subscriptions.filter((s) => s.isConfirmed);
  const pending = subscriptions.filter((s) => !s.isConfirmed);

  return NextResponse.json({
    subscriptions,
    pending,
    confirmed,
    monthlyTotal: confirmed.reduce((sum, g) => sum + g.expectedAmount, 0),
    pendingMonthlyTotal: pending.reduce((sum, g) => sum + g.expectedAmount, 0),
  });
}
