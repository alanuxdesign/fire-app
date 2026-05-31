import { requireUserId } from "@/lib/api-auth";
import { backfillUserBalanceHistory } from "@/lib/plaid-backfill";
import { getPlaidErrorMessage } from "@/lib/plaid";
import { NextResponse } from "next/server";

export async function POST() {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const result = await backfillUserBalanceHistory(authResult.userId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: getPlaidErrorMessage(error) },
      { status: 500 },
    );
  }
}
