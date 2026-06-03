export type TransactionSyncProgress = {
  phase:
    | "preparing"
    | "syncing_item"
    | "processing_page"
    | "subscriptions"
    | "done"
    | "error";
  message: string;
  /** 0–100; best-effort when total work is unknown */
  percent: number;
  itemsDone: number;
  itemsTotal: number;
  pagesDone: number;
  transactionsProcessed: number;
};

export function computeSyncPercent(options: {
  itemsTotal: number;
  itemsDone: number;
  pagesDone: number;
  hasMore: boolean;
  phase: TransactionSyncProgress["phase"];
}): number {
  const { itemsTotal, itemsDone, pagesDone, hasMore, phase } = options;
  if (phase === "done") return 100;
  if (phase === "preparing") return 2;
  if (phase === "subscriptions") return 92;
  if (phase === "error") return 0;

  if (itemsTotal <= 0) return 5;

  const itemShare = 85 / itemsTotal;
  const completedItems = itemsDone * itemShare;
  const currentItemProgress =
    itemsDone < itemsTotal
      ? Math.min(itemShare * 0.9, pagesDone * 2)
      : 0;
  const tail = hasMore ? 0 : itemShare * 0.1;
  return Math.min(90, Math.round(5 + completedItems + currentItemProgress + tail));
}
