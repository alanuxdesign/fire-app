"use client";

import { BudgetIcon } from "@/components/budget/BudgetIcon";
import { TransactionSplitEditor } from "@/components/budget/TransactionSplitEditor";
import { SheetShell } from "@/components/ui/SheetShell";
import type {
  BudgetCategoryOption,
  SerializedTransaction,
} from "@/lib/budget-types";
import { formatCurrency } from "@/lib/format";
import { X } from "lucide-react";
import { useState } from "react";

export type BudgetTag = {
  id: string;
  name: string;
  color: string | null;
};

type TransactionDetailSheetProps = {
  transaction: SerializedTransaction;
  categories: BudgetCategoryOption[];
  tags: BudgetTag[];
  isDemo?: boolean;
  onClose: () => void;
  onSave: (options: {
    transaction: SerializedTransaction;
    vendorApplyFuture: boolean;
    vendorApplyRetro: boolean;
    vendorRequiresReview: boolean;
  }) => Promise<void>;
  onCreateTag: (name: string) => Promise<BudgetTag | null>;
  onSplitsSaved?: () => void;
};

export function TransactionDetailSheet({
  transaction,
  categories,
  tags,
  isDemo = false,
  onClose,
  onSave,
  onCreateTag,
  onSplitsSaved,
}: TransactionDetailSheetProps) {
  const [txn, setTxn] = useState(transaction);
  const [vendorApplyFuture, setVendorApplyFuture] = useState(false);
  const [vendorApplyRetro, setVendorApplyRetro] = useState(false);
  const [vendorRequiresReview, setVendorRequiresReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const toggleTag = (tagId: string) => {
    const has = txn.tagIds.includes(tagId);
    setTxn({
      ...txn,
      tagIds: has
        ? txn.tagIds.filter((id) => id !== tagId)
        : [...txn.tagIds, tagId],
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        transaction: txn,
        vendorApplyFuture,
        vendorApplyRetro,
        vendorRequiresReview,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      zIndexClassName="z-[60]"
      backdropClassName="bg-canvas"
    >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Transaction</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-canvas-sunken"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-xl font-semibold tabular-nums">
          {formatCurrency(txn.amount)}
        </p>
        <p className="text-ink-secondary">
          {txn.merchantName ?? txn.name}
        </p>
        <p className="text-sm text-ink-secondary">
          {txn.date}
          {txn.pending ? " · Pending" : ""}
        </p>
        {txn.categoryLabel ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-secondary">
            {txn.categoryIcon ? (
              <BudgetIcon name={txn.categoryIcon} className="h-4 w-4" />
            ) : null}
            {txn.categoryLabel}
          </p>
        ) : null}

        <label className="mt-6 block text-sm font-medium">Bucket</label>
        <select
          value={txn.userCategoryId ?? ""}
          disabled={isDemo}
          onChange={(e) =>
            setTxn({
              ...txn,
              userCategoryId: e.target.value || null,
              reviewStatus: e.target.value ? "reviewed" : txn.reviewStatus,
            })
          }
          className="mt-1 w-full rounded-xl border border-hairline bg-surface px-3 py-2"
        >
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        <p className="mt-4 text-sm font-medium">Tags</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = txn.tagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                disabled={isDemo}
                onClick={() => toggleTag(tag.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-on-primary"
                    : "border border-hairline bg-surface text-ink-secondary"
                }`}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
        {!isDemo ? (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="New tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="flex-1 rounded-xl border border-hairline bg-surface px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={async () => {
                const name = newTagName.trim();
                if (!name) return;
                const created = await onCreateTag(name);
                if (created) {
                  setTxn({ ...txn, tagIds: [...txn.tagIds, created.id] });
                  setNewTagName("");
                }
              }}
              className="rounded-xl border border-hairline px-3 py-2 text-sm font-medium"
            >
              Add
            </button>
          </div>
        ) : null}

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={txn.includeInBudget}
            disabled={isDemo}
            onChange={(e) =>
              setTxn({ ...txn, includeInBudget: e.target.checked })
            }
          />
          Include in budget
        </label>

        <TransactionSplitEditor
          transactionId={txn.id}
          parentAmount={txn.amount}
          categories={categories}
          isDemo={isDemo}
          onSaved={() => onSplitsSaved?.()}
        />

        <label className="mt-4 block text-sm font-medium">Note</label>
        <textarea
          value={txn.note ?? ""}
          disabled={isDemo}
          onChange={(e) => setTxn({ ...txn, note: e.target.value })}
          className="mt-1 w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-sm"
          rows={2}
        />

        {!isDemo && txn.merchantKey ? (
          <div className="mt-4 space-y-2 rounded-xl border border-hairline p-3">
            <p className="text-sm font-medium">Apply to vendor</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={vendorApplyFuture}
                onChange={(e) => setVendorApplyFuture(e.target.checked)}
              />
              Future transactions
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={vendorApplyRetro}
                onChange={(e) => setVendorApplyRetro(e.target.checked)}
                disabled={!txn.userCategoryId}
              />
              Past transactions (24 mo)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={vendorRequiresReview}
                onChange={(e) => setVendorRequiresReview(e.target.checked)}
              />
              Always require review
            </label>
          </div>
        ) : null}

        {!isDemo ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="mt-6 w-full rounded-2xl bg-primary py-3 font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        ) : null}
    </SheetShell>
  );
}
