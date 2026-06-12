import { requireWritableUser } from "@/lib/api-auth";
import { categoriesBelongToUser } from "@/lib/budget-validation";
import { subscriptionGroups } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    isConfirmed?: boolean;
    categoryId?: string | null;
    expectedAmount?: number;
    cadence?: string;
  };

  const existing = await db.query.subscriptionGroups.findFirst({
    where: and(
      eq(subscriptionGroups.id, id),
      eq(subscriptionGroups.userId, authResult.userId),
    ),
  });

  if (!existing || existing.isDismissed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await categoriesBelongToUser(authResult.userId, [body.categoryId]))) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const [updated] = await db
    .update(subscriptionGroups)
    .set({
      ...(body.isConfirmed !== undefined
        ? { isConfirmed: body.isConfirmed }
        : {}),
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
      ...(body.expectedAmount !== undefined
        ? { expectedAmount: String(body.expectedAmount) }
        : {}),
      ...(body.cadence?.trim() ? { cadence: body.cadence.trim() } : {}),
    })
    .where(eq(subscriptionGroups.id, id))
    .returning();

  return NextResponse.json({ subscription: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;

  const existing = await db.query.subscriptionGroups.findFirst({
    where: and(
      eq(subscriptionGroups.id, id),
      eq(subscriptionGroups.userId, authResult.userId),
    ),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .update(subscriptionGroups)
    .set({ isDismissed: true, isConfirmed: false })
    .where(eq(subscriptionGroups.id, id));

  return NextResponse.json({ success: true });
}
