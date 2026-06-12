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
      className="rounded-2xl border border-hairline bg-surface p-4"
      role="status"
      aria-live="polite"
      aria-busy={percent < 100}
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-ink">
          {message}
        </span>
        <span className="tabular-nums text-ink-secondary">{percent}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas-sunken">
        <div
          className="h-full rounded-full bg-gain transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
      {showTxnCount ? (
        <p className="mt-2 text-xs text-ink-secondary">
          {progress.transactionsProcessed.toLocaleString()} transactions processed
          {progress.itemsTotal > 0
            ? ` · institution ${progress.itemsDone + 1} of ${progress.itemsTotal}`
            : ""}
        </p>
      ) : null}
      {percent < 100 ? (
        <details className="mt-3 text-xs text-ink-secondary">
          <summary className="cursor-pointer font-medium text-ink-secondary">
            Is it stuck?
          </summary>
          <p className="mt-2 leading-relaxed">
            Open browser DevTools (F12) → <strong>Network</strong>. Look for{" "}
            <code className="rounded bg-canvas-sunken px-1">
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
