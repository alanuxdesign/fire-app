import type {
  AccountGroupResponse,
  AccountGroupType,
  AccountListItem,
  AccountsApiResponse,
} from "@/lib/account-groups";

export type ViewMode = "list" | "pie" | "table";

export type GroupingMode = "type" | "asset_class" | "institution" | "ungrouped";

export const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "list", label: "List" },
  { value: "pie", label: "Pie" },
  { value: "table", label: "Table" },
];

export const GROUPING_MODES: { value: GroupingMode; label: string }[] = [
  { value: "type", label: "By type" },
  { value: "asset_class", label: "By asset class" },
  { value: "institution", label: "By institution" },
  { value: "ungrouped", label: "Ungrouped" },
];

export const ASSET_CLASS_OPTIONS = [
  "Domestic Equity",
  "Int'l Equity",
  "Bonds",
  "REITs",
  "Cash",
  "T-Bills",
  "Real Estate",
  "Other",
] as const;

export type AssetClassLabel = (typeof ASSET_CLASS_OPTIONS)[number];

const TYPE_GROUP_ORDER: AccountGroupType[] = [
  "Cash",
  "Investments",
  "Real Estate",
  "Liabilities",
  "Other",
];

const ASSET_CLASS_ORDER: AssetClassLabel[] = [
  "Domestic Equity",
  "Int'l Equity",
  "Bonds",
  "REITs",
  "Cash",
  "T-Bills",
  "Real Estate",
  "Other",
];

export const SEGMENT_COLORS = [
  "#0d9488",
  "#0891b2",
  "#6366f1",
  "#8b5cf6",
  "#d97706",
  "#ea580c",
  "#e11d48",
  "#64748b",
  "#16a34a",
  "#2563eb",
];

export function flattenAccounts(data: AccountsApiResponse): AccountListItem[] {
  return data.groups.flatMap((group) => group.accounts);
}

export function resolveDefaultAssetClass(
  account: AccountListItem,
): AssetClassLabel {

  if (account.group === "Cash") {
    return "Cash";
  }

  if (account.group === "Real Estate") {
    return "Real Estate";
  }

  if (account.group === "Liabilities") {
    return "Other";
  }

  const subtype = account.subtype?.toLowerCase() ?? "";

  if (subtype.includes("bond")) {
    return "Bonds";
  }

  if (subtype.includes("reit")) {
    return "REITs";
  }

  if (subtype.includes("money market") || subtype.includes("t-bill")) {
    return "T-Bills";
  }

  if (subtype.includes("international") || subtype.includes("global")) {
    return "Int'l Equity";
  }

  if (account.group === "Investments") {
    return "Domestic Equity";
  }

  return "Other";
}

export function getEffectiveAssetClass(account: AccountListItem): AssetClassLabel {
  if (
    account.assetClassOverride &&
    ASSET_CLASS_OPTIONS.includes(account.assetClassOverride as AssetClassLabel)
  ) {
    return account.assetClassOverride as AssetClassLabel;
  }

  return resolveDefaultAssetClass(account);
}

/** @deprecated Use resolveDefaultAssetClass */
export function resolveAssetClass(account: AccountListItem): AssetClassLabel {
  return getEffectiveAssetClass(account);
}

export function getInstitutionLabel(account: AccountListItem): string {
  return account.institutionName ?? (account.isManual ? "Manual entry" : "Other");
}

function sumGroupTotal(accounts: AccountListItem[], groupName: string) {
  return accounts.reduce((sum, account) => {
    if (groupName === "Liabilities") {
      return sum + Math.abs(account.currentBalance);
    }
    return sum + account.currentBalance;
  }, 0);
}

function sortGroupKeys(keys: string[], order: string[]) {
  return [...keys].sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    if (aIndex === -1 && bIndex === -1) {
      return a.localeCompare(b);
    }
    if (aIndex === -1) {
      return 1;
    }
    if (bIndex === -1) {
      return -1;
    }
    return aIndex - bIndex;
  });
}

export function groupAccounts(
  accounts: AccountListItem[],
  mode: GroupingMode,
): AccountGroupResponse[] {
  if (mode === "ungrouped") {
    if (accounts.length === 0) {
      return [];
    }

    const sorted = [...accounts].sort(
      (a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance),
    );
    const monthlyChange = sorted.reduce(
      (sum, account) => sum + account.monthlyChange,
      0,
    );
    const monthStartTotal = sorted.reduce(
      (sum, account) => sum + (account.currentBalance - account.monthlyChange),
      0,
    );

    return [
      {
        type: "All accounts",
        total: sumGroupTotal(sorted, "All accounts"),
        monthlyChange,
        monthlyChangePercent:
          monthStartTotal !== 0
            ? (monthlyChange / Math.abs(monthStartTotal)) * 100
            : 0,
        accounts: sorted,
      },
    ];
  }

  const buckets = new Map<string, AccountListItem[]>();

  for (const account of accounts) {
    let key: string;

    switch (mode) {
      case "asset_class":
        key = getEffectiveAssetClass(account);
        break;
      case "institution":
        key = getInstitutionLabel(account);
        break;
      case "type":
      default:
        key = account.group;
        break;
    }

    const existing = buckets.get(key) ?? [];
    existing.push(account);
    buckets.set(key, existing);
  }

  const order =
    mode === "asset_class"
      ? ASSET_CLASS_ORDER
      : mode === "type"
        ? TYPE_GROUP_ORDER
        : [];

  const keys = sortGroupKeys([...buckets.keys()], order as string[]);

  return keys.map((key) => {
    const grouped = buckets.get(key) ?? [];
    const sorted = grouped.sort(
      (a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance),
    );
    const monthlyChange = sorted.reduce(
      (sum, account) => sum + account.monthlyChange,
      0,
    );
    const monthStartTotal = sorted.reduce((sum, account) => {
      const previous = account.currentBalance - account.monthlyChange;
      return sum + (key === "Liabilities" ? Math.abs(previous) : previous);
    }, 0);
    const total = sumGroupTotal(sorted, key);
    const monthlyChangePercent =
      monthStartTotal !== 0
        ? (monthlyChange / Math.abs(monthStartTotal)) * 100
        : 0;

    return {
      type: key,
      total,
      monthlyChange,
      monthlyChangePercent,
      accounts: sorted,
    };
  });
}

export function getPortfolioTotal(data: AccountsApiResponse) {
  return data.totalAssets + data.totalLiabilities;
}

export function getPercentOfPortfolio(
  balance: number,
  data: AccountsApiResponse,
): number {
  const total = getPortfolioTotal(data);
  if (total === 0) {
    return 0;
  }
  return (Math.abs(balance) / total) * 100;
}

export function getSegmentColor(index: number): string {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

export type TableRow = AccountListItem & {
  institution: string;
  assetClass: AssetClassLabel;
  percentOfPortfolio: number;
};

export function buildTableRows(
  accounts: AccountListItem[],
  data: AccountsApiResponse,
): TableRow[] {
  return accounts
    .map((account) => ({
      ...account,
      institution: getInstitutionLabel(account),
      assetClass: getEffectiveAssetClass(account),
      percentOfPortfolio: getPercentOfPortfolio(account.currentBalance, data),
    }))
    .sort((a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance));
}
