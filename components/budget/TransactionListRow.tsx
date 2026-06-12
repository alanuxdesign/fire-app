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
      className={`flex w-full items-center gap-2 rounded-2xl border bg-surface px-3 py-3 ${
        txn.pending
          ? "border-dashed border-hairline-strong"
          : "border-hairline"
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
            <p className="truncate font-medium text-ink">
              {txn.merchantName ?? txn.name}
            </p>
            {txn.note?.trim() ? (
              <StickyNote
                className="h-3.5 w-3.5 shrink-0 text-warn"
                aria-label="Has note"
              />
            ) : null}
          </div>
          <p className="truncate text-xs text-ink-secondary">{meta}</p>
          {txn.note?.trim() ? (
            <p className="mt-0.5 truncate text-xs italic text-ink-muted">
              {txn.note}
            </p>
          ) : null}
        </div>
        <span className="ml-2 shrink-0 tabular-nums text-ink">
          {formatCurrency(txn.amount)}
        </span>
      </button>
    </div>
  );
}
