export const MANUAL_ASSET_TYPES = [
  { value: "real_estate", label: "Real Estate" },
  { value: "vehicle", label: "Vehicle" },
  { value: "crypto", label: "Crypto" },
  { value: "collectible", label: "Collectible" },
  { value: "other", label: "Other" },
] as const;

export type ManualAssetType = (typeof MANUAL_ASSET_TYPES)[number]["value"];

const MANUAL_ASSET_TYPE_SET = new Set<string>(
  MANUAL_ASSET_TYPES.map((t) => t.value),
);

export function isManualAssetType(value: string): value is ManualAssetType {
  return MANUAL_ASSET_TYPE_SET.has(value);
}

export function getManualAssetLabel(assetType: string): string {
  return (
    MANUAL_ASSET_TYPES.find((t) => t.value === assetType)?.label ??
    assetType.replace("_", " ")
  );
}

export function parseCurrencyInput(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned) {
    return null;
  }
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
