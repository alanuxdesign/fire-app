import { requireUserId, requireWritableUser } from "@/lib/api-auth";
import { parseBalance } from "@/lib/account-groups";
import { getBudgetUserSettings } from "@/lib/budget-rollups";
import { budgetUserSettings } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function serializeSettings(row: typeof budgetUserSettings.$inferSelect) {
  return {
    includePendingInBudget: row.includePendingInBudget,
    monthlyBudgetTotal: row.monthlyBudgetTotal
      ? parseBalance(row.monthlyBudgetTotal)
      : null,
  };
}

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const settings = await getBudgetUserSettings(authResult.userId);
  return NextResponse.json({ settings: serializeSettings(settings) });
}

export async function PATCH(request: Request) {
  const authResult = await requireWritableUser();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    includePendingInBudget?: boolean;
    monthlyBudgetTotal?: number | null;
  };

  await getBudgetUserSettings(authResult.userId);

  const [updated] = await db
    .update(budgetUserSettings)
    .set({
      ...(body.includePendingInBudget !== undefined
        ? { includePendingInBudget: body.includePendingInBudget }
        : {}),
      ...(body.monthlyBudgetTotal !== undefined
        ? {
            monthlyBudgetTotal:
              body.monthlyBudgetTotal == null
                ? null
                : String(body.monthlyBudgetTotal),
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(budgetUserSettings.userId, authResult.userId))
    .returning();

  return NextResponse.json({ settings: serializeSettings(updated) });
}
