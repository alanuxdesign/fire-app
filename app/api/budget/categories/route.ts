import { requireUserId, requireWritableUser } from "@/lib/api-auth";
import { listBudgetCategoriesForUser, listSpendCategoriesForPicker } from "@/lib/budget-categories";
import { budgetCategories } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { searchParams } = new URL(request.url);
  const forPicker = searchParams.get("forPicker") === "1";

  const categories = forPicker
    ? await listSpendCategoriesForPicker(authResult.userId)
    : await listBudgetCategoriesForUser(authResult.userId);
  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      label: c.label,
      icon: c.icon,
      isSystem: c.isSystem,
      isIncome: c.isIncome,
      sortOrder: c.sortOrder,
      rolloverEnabled: c.rolloverEnabled,
    })),
  });
}

export async function POST(request: Request) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    label?: string;
    icon?: string;
  };

  const label = body.label?.trim();
  if (!label) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const [created] = await db
    .insert(budgetCategories)
    .values({
      userId: authResult.userId,
      slug: `${slug}-${Date.now()}`,
      label,
      icon: body.icon?.trim() || "CircleDollarSign",
      isSystem: false,
      sortOrder: 150,
    })
    .returning();

  return NextResponse.json({ category: created });
}
