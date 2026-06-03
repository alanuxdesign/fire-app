import { requireUserId } from "@/lib/api-auth";
import { getReviewCount } from "@/lib/budget-rollups";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const count = await getReviewCount(authResult.userId);
  return NextResponse.json({ count });
}
