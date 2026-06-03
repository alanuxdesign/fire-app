"use client";

import type { SerializedTransaction } from "@/lib/budget-types";
import { formatCurrency } from "@/lib/format";
import { StickyNote } from "lucide-react";

type TransactionListRowProps = {
  transaction: SerializedTransaction;
  onClick: () => void;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  subtitle?: string;
};

export function TransactionListRow({
  transaction: txn,
  onClick,
  bulkMode = false,
  selected = false,
  onToggleSelect,
  subtitle,
}: TransactionListRowProps) {
  const meta =
    subtitle ??
    [
      txn.date,
      txn.categoryLabel,
      txn.pending ? "Pending" : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div
      className={`flex w-full items-center gap-2 rounded-2xl border bg-white px-3 py-3 dark:bg-zinc-900 ${
        txn.pending
          ? "border-dashed border-zinc-300 dark:border-zinc-600"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {bulkMode ? (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
          aria-label={`Select ${txn.merchantName ?? txn.name}`}
        />
      ) : null}
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center justify-between text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
              {txn.merchantName ?? txn.name}
            </p>
            {txn.note?.trim() ? (
              <StickyNote
                className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                aria-label="Has note"
              />
            ) : null}
          </div>
          <p className="truncate text-xs text-zinc-500">{meta}</p>
          {txn.note?.trim() ? (
            <p className="mt-0.5 truncate text-xs italic text-zinc-400">
              {txn.note}
            </p>
          ) : null}
        </div>
        <span className="ml-2 shrink-0 tabular-nums text-zinc-900 dark:text-zinc-100">
          {formatCurrency(txn.amount)}
        </span>
      </button>
    </div>
  );
}
