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
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg px-4 lg:bottom-6 lg:left-60">
      <div className="rounded-[18px] border border-hairline bg-paper-2 p-3 shadow-card">
        <p className="text-sm font-medium text-ink">
          {selectedCount} selected
        </p>
        <div className="mt-2 flex gap-2">
          <select
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-hairline bg-surface px-2 py-2 text-sm"
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
            className="rounded-full bg-terra-deep px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-terra disabled:opacity-50"
          >
            {applying ? "…" : "Apply"}
          </button>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="mt-2 text-xs text-ink-secondary underline"
        >
          Clear selection
        </button>
        {message ? (
          <p className="mt-2 text-xs text-gain">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
