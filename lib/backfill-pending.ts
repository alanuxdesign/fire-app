export const BACKFILL_PENDING_KEY = "fire-backfill-pending";

/** Enough daily points to consider backfill materially complete. */
export const BACKFILL_MIN_SNAPSHOT_COUNT = 28;

export function isBackfillPending(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return sessionStorage.getItem(BACKFILL_PENDING_KEY) === "1";
}

export function setBackfillPending(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(BACKFILL_PENDING_KEY, "1");
}

export function clearBackfillPending(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(BACKFILL_PENDING_KEY);
}
