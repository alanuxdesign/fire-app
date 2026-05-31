import { financialAccounts, plaidItems } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { parseBalance } from "@/lib/account-groups";
import { plaidClient } from "@/lib/plaid";
import { and, eq } from "drizzle-orm";
import type { AccountBase } from "plaid";

export type StoredFinancialAccount = typeof financialAccounts.$inferSelect;

export function mapPlaidAccountToRow(
  account: AccountBase,
  userId: string,
  plaidItemId: string,
): typeof financialAccounts.$inferInsert {
  return {
    userId,
    plaidItemId,
    plaidAccountId: account.account_id,
    name: account.name,
    officialName: account.official_name ?? null,
    type: account.type,
    subtype: account.subtype ?? null,
    currentBalance: String(account.balances.current ?? 0),
    availableBalance:
      account.balances.available != null
        ? String(account.balances.available)
        : null,
    currency: account.balances.iso_currency_code ?? "USD",
    isManual: false,
    assetClass: null,
  };
}

export async function upsertFinancialAccount(
  account: AccountBase,
  userId: string,
  plaidItemId: string,
): Promise<StoredFinancialAccount> {
  const values = mapPlaidAccountToRow(account, userId, plaidItemId);

  const existing = await db.query.financialAccounts.findFirst({
    where: and(
      eq(financialAccounts.userId, userId),
      eq(financialAccounts.plaidAccountId, account.account_id),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(financialAccounts)
      .set({
        name: values.name,
        officialName: values.officialName,
        type: values.type,
        subtype: values.subtype,
        currentBalance: values.currentBalance,
        availableBalance: values.availableBalance,
        currency: values.currency,
        plaidItemId: values.plaidItemId,
        updatedAt: new Date(),
        // Preserve user asset class override on sync
      })
      .where(eq(financialAccounts.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(financialAccounts)
    .values(values)
    .returning();

  return created;
}

export async function syncPlaidItemAccounts(
  plaidItemId: string,
  accessToken: string,
  userId: string,
): Promise<StoredFinancialAccount[]> {
  const response = await plaidClient.accountsGet({ access_token: accessToken });
  const accounts = response.data.accounts;

  const stored: StoredFinancialAccount[] = [];

  for (const account of accounts) {
    stored.push(await upsertFinancialAccount(account, userId, plaidItemId));
  }

  return stored;
}

export function serializeFinancialAccount(account: StoredFinancialAccount) {
  return {
    id: account.id,
    name: account.name,
    officialName: account.officialName,
    type: account.type,
    subtype: account.subtype,
    currentBalance: parseBalance(account.currentBalance),
    availableBalance: account.availableBalance
      ? parseBalance(account.availableBalance)
      : null,
    currency: account.currency,
    plaidItemId: account.plaidItemId,
    plaidAccountId: account.plaidAccountId,
    updatedAt: account.updatedAt.toISOString(),
  };
}

export type PlaidLinkMetadata = {
  institution?: {
    institution_id?: string;
    name?: string;
  };
};

export async function getInstitutionNamesForUser(userId: string) {
  const items = await db.query.plaidItems.findMany({
    where: eq(plaidItems.userId, userId),
  });

  return new Map(items.map((item) => [item.id, item.institutionName]));
}
