import { requireWritableUser } from "@/lib/api-auth";
import { categoriesBelongToUser } from "@/lib/budget-validation";
import { parseCurrencyInput } from "@/lib/currency";
import { budgetTargets } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    month?: string;
    categoryId?: string;
    amount?: number | string | null;
  };

  if (!body.month || !body.categoryId) {
    return NextResponse.json(
      { error: "month and categoryId are required" },
      { status: 400 },
    );
  }

  const amount = parseCurrencyInput(body.amount ?? null);
  if (amount === null || amount < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  if (!(await categoriesBelongToUser(authResult.userId, [body.categoryId]))) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  await db
    .insert(budgetTargets)
    .values({
      userId: authResult.userId,
      categoryId: body.categoryId,
      month: body.month,
      amount: String(amount),
    })
    .onConflictDoUpdate({
      target: [
        budgetTargets.userId,
        budgetTargets.categoryId,
        budgetTargets.month,
      ],
      set: { amount: String(amount) },
    });

  return NextResponse.json({ success: true });
}
