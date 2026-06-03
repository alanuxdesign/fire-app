import { requireWritableUser } from "@/lib/api-auth";
import { transactionTags, transactions } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    ids?: string[];
    userCategoryId?: string | null;
    tagIds?: string[];
    includeInBudget?: boolean;
    markReviewed?: boolean;
  };

  if (!body.ids?.length) {
    return NextResponse.json({ error: "ids is required" }, { status: 400 });
  }

  const rows = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, authResult.userId),
      inArray(transactions.id, body.ids),
    ),
  });

  if (rows.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const now = new Date();
  const markReviewed = body.markReviewed === true;

  for (const row of rows) {
    await db
      .update(transactions)
      .set({
        ...(body.userCategoryId !== undefined
          ? { userCategoryId: body.userCategoryId }
          : {}),
        ...(body.includeInBudget !== undefined
          ? { includeInBudget: body.includeInBudget }
          : {}),
        ...(markReviewed
          ? { reviewStatus: "reviewed", reviewedAt: now }
          : {}),
        updatedAt: now,
      })
      .where(eq(transactions.id, row.id));

    if (body.tagIds !== undefined) {
      await db
        .delete(transactionTags)
        .where(eq(transactionTags.transactionId, row.id));
      if (body.tagIds.length > 0) {
        await db.insert(transactionTags).values(
          body.tagIds.map((tagId) => ({
            transactionId: row.id,
            tagId,
          })),
        );
      }
    }
  }

  return NextResponse.json({ updated: rows.length });
}
