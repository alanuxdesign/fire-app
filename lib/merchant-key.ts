/** Normalize merchant/name for vendor rules and grouping. */
export function getMerchantKey(
  merchantName: string | null | undefined,
  name: string,
): string {
  const raw = (merchantName?.trim() || name.trim()).toLowerCase();
  return raw
    .replace(/\s+#\d+.*$/, "")
    .replace(/\s+\d{4,}.*$/, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const AMBIGUOUS_MERCHANT_PATTERNS = [
  "amazon",
  "amzn",
  "target",
  "walmart",
  "costco",
  "paypal",
  "venmo",
  "apple.com/bill",
  "google",
  "uber",
  "doordash",
];

export function isAmbiguousMerchant(merchantKey: string): boolean {
  return AMBIGUOUS_MERCHANT_PATTERNS.some(
    (pattern) => merchantKey.includes(pattern) || pattern.includes(merchantKey),
  );
}
