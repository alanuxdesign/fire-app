import { requireUserId } from "@/lib/api-auth";
import { findDuplicateCandidates } from "@/lib/transaction-duplicates";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const groups = await findDuplicateCandidates(authResult.userId);
  return NextResponse.json({ groups });
}
