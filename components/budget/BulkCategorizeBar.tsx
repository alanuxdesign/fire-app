"use client";

import type { BudgetCategoryOption } from "@/lib/budget-types";

type BulkCategorizeBarProps = {
  selectedCount: number;
  categories: BudgetCategoryOption[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
  onApply: () => void;
  onClear: () => void;
  applying?: boolean;
  message?: string | null;
};

export function BulkCategorizeBar({
  selectedCount,
  categories,
  categoryId,
  onCategoryChange,
  onApply,
  onClear,
  applying = false,
  message,
}: BulkCategorizeBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg px-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {selectedCount} selected
        </p>
        <div className="mt-2 flex gap-2">
          <select
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Choose bucket…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!categoryId || applying}
            onClick={onApply}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {applying ? "…" : "Apply"}
          </button>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="mt-2 text-xs text-zinc-500 underline"
        >
          Clear selection
        </button>
        {message ? (
          <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
