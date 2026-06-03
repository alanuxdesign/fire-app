import type { TransactionSyncProgress } from "@/lib/transaction-sync-progress";

type BudgetSyncProgressProps = {
  progress: TransactionSyncProgress | null;
  initialLoading?: boolean;
};

export function BudgetSyncProgress({
  progress,
  initialLoading = false,
}: BudgetSyncProgressProps) {
  if (!progress && !initialLoading) return null;

  const percent = progress?.percent ?? (initialLoading ? 3 : 0);
  const message =
    progress?.message ??
    (initialLoading ? "Loading your budget…" : "Syncing transactions…");

  const showTxnCount =
    progress && progress.transactionsProcessed > 0 && progress.phase !== "done";

  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      role="status"
      aria-live="polite"
      aria-busy={percent < 100}
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {message}
        </span>
        <span className="tabular-nums text-zinc-500">{percent}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
      {showTxnCount ? (
        <p className="mt-2 text-xs text-zinc-500">
          {progress.transactionsProcessed.toLocaleString()} transactions processed
          {progress.itemsTotal > 0
            ? ` · institution ${progress.itemsDone + 1} of ${progress.itemsTotal}`
            : ""}
        </p>
      ) : null}
      {percent < 100 ? (
        <details className="mt-3 text-xs text-zinc-500">
          <summary className="cursor-pointer font-medium text-zinc-600 dark:text-zinc-400">
            Is it stuck?
          </summary>
          <p className="mt-2 leading-relaxed">
            Open browser DevTools (F12) → <strong>Network</strong>. Look for{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              sync-transactions?stream=1
            </code>
            . If it shows <strong>Pending</strong>, sync is still running (first
            sync can take several minutes). If it is <strong>Failed</strong> or
            pending over 10 minutes with 0% change, refresh and try again from
            Settings → Sync transactions.
          </p>
        </details>
      ) : null}
    </div>
  );
}
