import type { AccountGroupType, AccountListItem } from "@/lib/account-groups";
import { formatCurrency } from "@/lib/format";

export function isLiabilityAccount(account: {
  group: AccountGroupType;
}): boolean {
  return account.group === "Liabilities";
}

/** Balance with liabilities as negative (for sums and net-worth-style display). */
export function signedAccountBalance(account: {
  group: AccountGroupType;
  currentBalance: number;
}): number {
  if (isLiabilityAccount(account)) {
    return -Math.abs(account.currentBalance);
  }
  return account.currentBalance;
}

function formatCurrencyAccounting(amount: number, currency = "USD"): string {
  if (amount < 0) {
    return `(${formatCurrency(Math.abs(amount), currency)})`;
  }
  return formatCurrency(amount, currency);
}

/** Currency display for a single account (parentheses for liabilities). */
export function formatAccountBalance(
  account: {
    group: AccountGroupType;
    currentBalance: number;
    currency?: string;
  },
): string {
  return formatCurrencyAccounting(
    signedAccountBalance(account),
    account.currency,
  );
}

/** Format a group total; pass isLiabilityGroup when the section is a liabilities bucket. */
export function formatGroupTotal(
  total: number,
  options?: { isLiabilityGroup?: boolean; currency?: string },
): string {
  const signed = options?.isLiabilityGroup ? -Math.abs(total) : total;
  return formatCurrencyAccounting(signed, options?.currency);
}

export function isLiabilityGroupName(groupName: string): boolean {
  return groupName === "Liabilities";
}

export function plaidInstitutionLogoUrl(
  institutionId: string | null | undefined,
): string | null {
  if (!institutionId || institutionId === "unknown") {
    return null;
  }
  return `https://logo.plaid.com/${institutionId}/primary/png`;
}

export function institutionAvatarLabel(account: AccountListItem): string {
  return account.institutionName ?? account.name;
}

export function institutionAvatarInitial(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return "?";
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]!.charAt(0)}${words[1]!.charAt(0)}`.toUpperCase();
  }
  return trimmed.charAt(0).toUpperCase();
}
