import { requireUserId } from "@/lib/api-auth";
import { buildAccountsResponse } from "@/lib/account-groups";
import { financialAccounts, manualAssets } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { getInstitutionNamesForUser } from "@/lib/plaid-accounts";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const [financialRows, manualRows, institutionNames] = await Promise.all([
      db.query.financialAccounts.findMany({
        where: eq(financialAccounts.userId, authResult.userId),
      }),
      db.query.manualAssets.findMany({
        where: eq(manualAssets.userId, authResult.userId),
      }),
      getInstitutionNamesForUser(authResult.userId),
    ]);

    const response = buildAccountsResponse(
      financialRows,
      manualRows,
      institutionNames,
    );

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load accounts",
      },
      { status: 500 },
    );
  }
}
