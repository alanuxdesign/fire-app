import {
  parseBalance,
  type AccountGroupType,
  type AccountListItem,
} from "@/lib/account-groups";

export type AccountAccessibility = "immediate" | "reachable" | "locked";

const FI_ASSET_GROUPS: AccountGroupType[] = ["Cash", "Investments"];

const LOCKED_SUBTYPES = new Set([
  "401k",
  "401a",
  "403b",
  "457b",
  "ira",
  "roth",
  "roth 401k",
  "sep ira",
  "simple ira",
  "hsa",
  "pension",
]);

function normalizeSubtype(subtype: string | null): string {
  return (subtype ?? "").trim().toLowerCase();
}

/** Default accessibility when the user has not set an override. */
export function defaultAccessibility(account: AccountListItem): AccountAccessibility {
  if (account.group === "Cash") {
    return "immediate";
  }

  if (account.group === "Investments") {
    const subtype = normalizeSubtype(account.subtype);
    if (
      LOCKED_SUBTYPES.has(subtype) ||
      subtype.includes("401") ||
      subtype.includes("ira") ||
      subtype === "hsa"
    ) {
      return "locked";
    }
    return "reachable";
  }

  if (account.group === "Real Estate") {
    return "locked";
  }

  return "reachable";
}

export function resolveAccessibility(
  account: AccountListItem,
  override: AccountAccessibility | null | undefined,
): AccountAccessibility {
  return override ?? defaultAccessibility(account);
}

export function isFiAssetGroup(group: AccountGroupType): boolean {
  return FI_ASSET_GROUPS.includes(group);
}

export type LifePlanAssetTotals = {
  /** Invested + liquid assets (A) — powers coverage and target progress. */
  totalInvestedLiquid: number;
  /** Accessible subset (A_acc) — powers runway. */
  totalAccessible: number;
};

export function sumLifePlanAssets(
  accounts: AccountListItem[],
  accessibilityOverrides: Map<string, AccountAccessibility | null>,
): LifePlanAssetTotals {
  let totalInvestedLiquid = 0;
  let totalAccessible = 0;

  for (const account of accounts) {
    if (!isFiAssetGroup(account.group)) continue;

    const balance = account.currentBalance;
    if (balance <= 0) continue;

    totalInvestedLiquid += balance;

    const accessibility = resolveAccessibility(
      account,
      accessibilityOverrides.get(account.id) ?? null,
    );
    if (accessibility === "immediate" || accessibility === "reachable") {
      totalAccessible += balance;
    }
  }

  return { totalInvestedLiquid, totalAccessible };
}

export function parseAccessibilityValue(
  value: string | null | undefined,
): AccountAccessibility | null {
  if (value === "immediate" || value === "reachable" || value === "locked") {
    return value;
  }
  return null;
}

export function parseNumericField(value: string | null | undefined): number {
  return parseBalance(value ?? null);
}
