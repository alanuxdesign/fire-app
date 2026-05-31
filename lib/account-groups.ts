import { financialAccounts, manualAssets } from "@/drizzle/schema";
import { getManualAssetLabel } from "@/lib/manual-assets";

export type AccountGroupType =
  | "Cash"
  | "Investments"
  | "Liabilities"
  | "Real Estate"
  | "Other";

export type FinancialAccountRow = typeof financialAccounts.$inferSelect;
export type ManualAssetRow = typeof manualAssets.$inferSelect;

export type AccountListItem = {
  id: string;
  name: string;
  subtitle: string | null;
  type: string;
  group: AccountGroupType;
  currentBalance: number;
  currency: string;
  institutionName: string | null;
  updatedAt: string;
  isManual: boolean;
};

export function getFinancialAccountGroup(
  type: string,
  subtype?: string | null,
): AccountGroupType {
  switch (type) {
    case "depository":
      return "Cash";
    case "investment":
    case "brokerage":
      return "Investments";
    case "credit":
    case "loan":
      return "Liabilities";
    default:
      return "Other";
  }
}

export function getManualAssetGroup(assetType: string): AccountGroupType {
  switch (assetType) {
    case "real_estate":
      return "Real Estate";
    case "crypto":
      return "Investments";
    default:
      return "Other";
  }
}

export function parseBalance(value: string | null): number {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatAccountSubtitle(
  type: string,
  subtype?: string | null,
): string | null {
  if (subtype) {
    return subtype.charAt(0).toUpperCase() + subtype.slice(1);
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
}

const GROUP_ORDER: AccountGroupType[] = [
  "Cash",
  "Investments",
  "Real Estate",
  "Liabilities",
  "Other",
];

export type AccountGroupResponse = {
  type: AccountGroupType;
  total: number;
  monthlyChange: number;
  monthlyChangePercent: number;
  accounts: AccountListItem[];
};

export type AccountsApiResponse = {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorthChangePercent: number;
  netWorthChangeAmount: number;
  groups: AccountGroupResponse[];
  lastUpdated: string | null;
};

export function buildAccountsResponse(
  financialRows: FinancialAccountRow[],
  manualRows: ManualAssetRow[],
  institutionNames: Map<string, string>,
): AccountsApiResponse {
  const items: AccountListItem[] = [
    ...financialRows.map((row) => ({
      id: row.id,
      name: row.name,
      subtitle: formatAccountSubtitle(row.type, row.subtype),
      type: row.type,
      group: getFinancialAccountGroup(row.type, row.subtype),
      currentBalance: parseBalance(row.currentBalance),
      currency: row.currency,
      institutionName: row.plaidItemId
        ? (institutionNames.get(row.plaidItemId) ?? null)
        : null,
      updatedAt: row.updatedAt.toISOString(),
      isManual: row.isManual,
    })),
    ...manualRows.map((row) => ({
      id: row.id,
      name: row.name,
      subtitle: getManualAssetLabel(row.assetType),
      type: row.assetType,
      group: getManualAssetGroup(row.assetType),
      currentBalance: parseBalance(row.currentValue),
      currency: "USD",
      institutionName: null,
      updatedAt: row.updatedAt.toISOString(),
      isManual: true,
    })),
  ];

  const groupMap = new Map<AccountGroupType, AccountListItem[]>();

  for (const item of items) {
    const existing = groupMap.get(item.group) ?? [];
    existing.push(item);
    groupMap.set(item.group, existing);
  }

  const groups: AccountGroupResponse[] = GROUP_ORDER.filter((type) =>
    groupMap.has(type),
  ).map((type) => {
    const accounts = groupMap.get(type) ?? [];
    const total = accounts.reduce((sum, account) => {
      if (type === "Liabilities") {
        return sum + Math.abs(account.currentBalance);
      }
      return sum + account.currentBalance;
    }, 0);

    return {
      type,
      total,
      monthlyChange: 0,
      monthlyChangePercent: 0,
      accounts,
    };
  });

  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const group of groups) {
    if (group.type === "Liabilities") {
      totalLiabilities += group.total;
    } else {
      totalAssets += group.total;
    }
  }

  const lastUpdated = items.reduce<string | null>((latest, item) => {
    if (!latest || item.updatedAt > latest) {
      return item.updatedAt;
    }
    return latest;
  }, null);

  return {
    netWorth: totalAssets - totalLiabilities,
    totalAssets,
    totalLiabilities,
    netWorthChangePercent: 0,
    netWorthChangeAmount: 0,
    groups,
    lastUpdated,
  };
}
