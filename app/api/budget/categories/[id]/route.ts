import { requireWritableUser } from "@/lib/api-auth";
import { setRolloverOverride } from "@/lib/budget-categories";
import { budgetCategories, budgetTargets, transactions } from "@/drizzle/schema";
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
    label?: string;
    icon?: string;
    rolloverEnabled?: boolean;
  };

  const onlyRollover =
    body.rolloverEnabled !== undefined &&
    body.label === undefined &&
    body.icon === undefined;

  const category = await db.query.budgetCategories.findFirst({
    where: eq(budgetCategories.id, id),
  });

  // Visible categories are the user's own plus global system rows; anything
  // else must stay untouchable even for rollover-only updates.
  const canAccess =
    category &&
    (category.userId === authResult.userId ||
      (category.isSystem && category.userId === null));

  if (!category || !canAccess) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  if (onlyRollover) {
    if (category.userId === authResult.userId) {
      const [updated] = await db
        .update(budgetCategories)
        .set({ rolloverEnabled: body.rolloverEnabled })
        .where(eq(budgetCategories.id, id))
        .returning();
      return NextResponse.json({ category: updated });
    }

    // Shared system bucket: store a per-user pref instead of mutating the
    // global row, which every user reads.
    await setRolloverOverride(authResult.userId, id, body.rolloverEnabled!);
    return NextResponse.json({
      category: { ...category, rolloverEnabled: body.rolloverEnabled },
    });
  }

  if (
    category.isSystem ||
    category.userId !== authResult.userId
  ) {
    return NextResponse.json(
      { error: "Category not found or cannot edit" },
      { status: 404 },
    );
  }

  const [updated] = await db
    .update(budgetCategories)
    .set({
      ...(body.label?.trim() ? { label: body.label.trim() } : {}),
      ...(body.icon?.trim() ? { icon: body.icon.trim() } : {}),
      ...(body.rolloverEnabled !== undefined
        ? { rolloverEnabled: body.rolloverEnabled }
        : {}),
    })
    .where(eq(budgetCategories.id, id))
    .returning();

  return NextResponse.json({ category: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;

  const category = await db.query.budgetCategories.findFirst({
    where: and(
      eq(budgetCategories.id, id),
      eq(budgetCategories.userId, authResult.userId),
      eq(budgetCategories.isSystem, false),
    ),
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  await db
    .update(transactions)
    .set({ userCategoryId: null, updatedAt: new Date() })
    .where(
      and(
        eq(transactions.userId, authResult.userId),
        eq(transactions.userCategoryId, id),
      ),
    );

  await db
    .delete(budgetTargets)
    .where(
      and(
        eq(budgetTargets.userId, authResult.userId),
        eq(budgetTargets.categoryId, id),
      ),
    );

  await db
    .update(budgetCategories)
    .set({ deletedAt: new Date() })
    .where(eq(budgetCategories.id, id));

  return NextResponse.json({ success: true });
}
