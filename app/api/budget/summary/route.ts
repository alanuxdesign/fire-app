import { requireUserId } from "@/lib/api-auth";
import { getCurrentBudgetMonth } from "@/lib/budget-month";
import { getBudgetSummary } from "@/lib/budget-rollups";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? getCurrentBudgetMonth();

  const summary = await getBudgetSummary(authResult.userId, month);
  return NextResponse.json(summary);
}
