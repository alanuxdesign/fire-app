import {
  buildHoldingsSummary,
  manualMarketHolding,
  mapPlaidHolding,
  type AccountHoldingsResponse,
} from "@/lib/account-holdings";
import { parseBalance } from "@/lib/account-groups";
import { financialAccounts, manualAssets, plaidItems } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { fetchMarketPrice } from "@/lib/market-prices";
import { getPlaidErrorMessage, plaidClient } from "@/lib/plaid";
import { and, eq } from "drizzle-orm";
import type { Security } from "plaid";

export async function getAccountHoldingsForUser(
  userId: string,
  accountId: string,
): Promise<AccountHoldingsResponse> {
  const financial = await db.query.financialAccounts.findFirst({
    where: and(
      eq(financialAccounts.id, accountId),
      eq(financialAccounts.userId, userId),
    ),
  });

  if (financial) {
    return getPlaidAccountHoldings(financial);
  }

  const manual = await db.query.manualAssets.findFirst({
    where: and(
      eq(manualAssets.id, accountId),
      eq(manualAssets.userId, userId),
    ),
  });

  if (!manual) {
    throw new Error("Account not found");
  }

  return getManualAccountHoldings(manual);
}

async function getManualAccountHoldings(
  manual: typeof manualAssets.$inferSelect,
): Promise<AccountHoldingsResponse> {
  const symbol = manual.marketSymbol?.trim().toUpperCase();
  if (!symbol) {
    return buildHoldingsSummary([], null);
  }

  const quantity = manual.marketQuantity
    ? parseBalance(manual.marketQuantity)
    : 1;
  const value = parseBalance(manual.currentValue);
  const price = await fetchMarketPrice(symbol);

  return buildHoldingsSummary(
    [
      manualMarketHolding(
        symbol,
        manual.name,
        quantity > 0 ? quantity : 1,
        value,
        price,
      ),
    ],
    new Date().toISOString(),
  );
}

async function getPlaidAccountHoldings(
  account: typeof financialAccounts.$inferSelect,
): Promise<AccountHoldingsResponse> {
  if (!account.plaidAccountId || !account.plaidItemId) {
    return buildHoldingsSummary([], null);
  }

  const item = await db.query.plaidItems.findFirst({
    where: and(
      eq(plaidItems.id, account.plaidItemId),
      eq(plaidItems.userId, account.userId),
    ),
  });

  if (!item) {
    return buildHoldingsSummary([], null);
  }

  try {
    const response = await plaidClient.investmentsHoldingsGet({
      access_token: item.accessToken,
      options: {
        account_ids: [account.plaidAccountId],
      },
    });

    const securitiesById = new Map<string, Security>(
      response.data.securities.map((security) => [security.security_id, security]),
    );

    const holdings = response.data.holdings
      .filter((holding) => holding.account_id === account.plaidAccountId)
      .filter((holding) => holding.quantity > 0 || holding.institution_value > 0)
      .map((holding) =>
        mapPlaidHolding(holding, securitiesById.get(holding.security_id)),
      )
      .sort((a, b) => b.value - a.value);

    const asOf =
      response.data.holdings.find(
        (holding) => holding.institution_price_as_of,
      )?.institution_price_as_of ?? null;

    return buildHoldingsSummary(holdings, asOf);
  } catch (error) {
    throw new Error(getPlaidErrorMessage(error));
  }
}
