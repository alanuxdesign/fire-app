import { requireUserId } from "@/lib/api-auth";
import { getBudgetTwelveMonthAverages } from "@/lib/budget-rollups";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { searchParams } = new URL(request.url);
  const months = Math.min(24, Math.max(1, Number(searchParams.get("months") ?? "12")));

  const averages = await getBudgetTwelveMonthAverages(authResult.userId, months);
  const withData = averages.filter((a) => a.monthsWithSpend > 0);

  return NextResponse.json({
    monthsSampled: months,
    averages,
    bucketsWithData: withData.length,
  });
}
