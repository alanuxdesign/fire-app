import { requireWritableUser } from "@/lib/api-auth";
import { transactions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    transactionIds?: string[];
    markAllPending?: boolean;
    userCategoryId?: string | null;
    markReviewed?: boolean;
  };

  const markReviewed = body.markReviewed !== false;
  const conditions = [eq(transactions.userId, authResult.userId)];

  if (body.markAllPending) {
    conditions.push(eq(transactions.reviewStatus, "pending"));
  } else if (body.transactionIds?.length) {
    conditions.push(inArray(transactions.id, body.transactionIds));
  } else {
    return NextResponse.json(
      { error: "transactionIds or markAllPending is required" },
      { status: 400 },
    );
  }

  const rows = await db.query.transactions.findMany({
    where: and(...conditions),
  });

  if (rows.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const now = new Date();
  for (const row of rows) {
    await db
      .update(transactions)
      .set({
        ...(body.userCategoryId !== undefined
          ? { userCategoryId: body.userCategoryId }
          : {}),
        ...(markReviewed
          ? { reviewStatus: "reviewed", reviewedAt: now }
          : {}),
        updatedAt: now,
      })
      .where(eq(transactions.id, row.id));
  }

  return NextResponse.json({ updated: rows.length });
}
