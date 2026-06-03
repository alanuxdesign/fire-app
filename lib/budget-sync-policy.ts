/** Auto-sync transactions when last sync is older than this (ms). */
export const BUDGET_SYNC_STALE_MS = 4 * 60 * 60 * 1000;

export type TransactionSyncStatus = {
  itemCount: number;
  hasSyncedBefore: boolean;
  lastSyncAt: string | null;
};

export function shouldAutoSyncTransactions(
  status: TransactionSyncStatus,
  now = Date.now(),
): boolean {
  if (status.itemCount === 0) return false;
  if (!status.hasSyncedBefore) return true;
  if (!status.lastSyncAt) return true;
  const last = new Date(status.lastSyncAt).getTime();
  if (Number.isNaN(last)) return true;
  return now - last > BUDGET_SYNC_STALE_MS;
}
