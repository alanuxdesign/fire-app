import { requireUserId } from "@/lib/api-auth";
import { getBucketMonthlyTrends } from "@/lib/budget-rollups";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const months = Number(searchParams.get("months") ?? "12");

  const trends = await getBucketMonthlyTrends(
    authResult.userId,
    id,
    Math.min(24, Math.max(3, months)),
  );

  return NextResponse.json({ trends });
}
