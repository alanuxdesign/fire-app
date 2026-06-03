import { requireUserId } from "@/lib/api-auth";
import { getCashFlowSeries } from "@/lib/budget-rollups";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { searchParams } = new URL(request.url);
  const months = Math.min(24, Math.max(1, Number(searchParams.get("months") ?? "12")));

  const series = await getCashFlowSeries(authResult.userId, months);
  return NextResponse.json({ series });
}
