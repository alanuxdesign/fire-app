import { requireUserId } from "@/lib/api-auth";
import { accountShowsHoldings } from "@/lib/account-holdings";
import { getFinancialAccountGroup, getManualAssetGroup, parseBalance } from "@/lib/account-groups";
import { financialAccounts, manualAssets } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { getAccountHoldingsForUser } from "@/lib/plaid-holdings";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireUserId();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;

  try {
    const [financial, manual] = await Promise.all([
      db.query.financialAccounts.findFirst({
        where: and(
          eq(financialAccounts.id, id),
          eq(financialAccounts.userId, authResult.userId),
        ),
      }),
      db.query.manualAssets.findFirst({
        where: and(
          eq(manualAssets.id, id),
          eq(manualAssets.userId, authResult.userId),
        ),
      }),
    ]);

    const row = financial ?? manual;
    if (!row) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const accountMeta = financial
      ? {
          group: getFinancialAccountGroup(financial.type, financial.subtype),
          type: financial.type,
          subtype: financial.subtype,
          isManual: false,
          marketSymbol: null,
          plaidAccountId: financial.plaidAccountId,
        }
      : {
          group: getManualAssetGroup(manual!.assetType),
          type: manual!.assetType,
          subtype: null,
          isManual: true,
          marketSymbol: manual!.marketSymbol,
          plaidAccountId: null,
        };

    if (!accountShowsHoldings(accountMeta)) {
      return NextResponse.json({
        holdings: [],
        totalValue: financial
          ? parseBalance(financial.currentBalance)
          : parseBalance(manual!.currentValue),
        totalGainLoss: null,
        totalGainLossPercent: null,
        asOf: null,
      });
    }

    const result = await getAccountHoldingsForUser(authResult.userId, id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load holdings",
      },
      { status: 500 },
    );
  }
}
