"use client";

import type { BudgetCategoryOption, TransactionSplitLine } from "@/lib/budget-types";
import { formatCurrency } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type TransactionSplitEditorProps = {
  transactionId: string;
  parentAmount: number;
  categories: BudgetCategoryOption[];
  isDemo?: boolean;
  onSaved: () => void;
};

export function TransactionSplitEditor({
  transactionId,
  parentAmount,
  categories,
  isDemo = false,
  onSaved,
}: TransactionSplitEditorProps) {
  const [lines, setLines] = useState<TransactionSplitLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/transactions/${transactionId}/splits`);
      if (cancelled) return;
      if (res.ok) {
        const body = (await res.json()) as { splits: TransactionSplitLine[] };
        setLines(
          body.splits.length > 0
            ? body.splits
            : [
                { categoryId: categories[0]?.id ?? "", amount: parentAmount },
                { categoryId: categories[0]?.id ?? "", amount: 0 },
              ],
        );
        if (body.splits.length > 0) setOpen(true);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [transactionId, categories, parentAmount]);

  const lineSum = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const sumOk = Math.abs(lineSum - parentAmount) < 0.01;

  const save = async () => {
    if (!sumOk) {
      setError("Split lines must sum to the transaction amount");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/splits`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.filter((l) => l.categoryId && l.amount !== 0),
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Failed to save splits");
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const clearSplits = async () => {
    setSaving(true);
    await fetch(`/api/transactions/${transactionId}/splits`, { method: "DELETE" });
    setLines([]);
    setOpen(false);
    setSaving(false);
    onSaved();
  };

  if (isDemo || loading) return null;

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
      >
        {open ? "Hide split" : "Split across buckets"}
      </button>

      {open ? (
        <div className="mt-3 space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={line.categoryId}
                onChange={(e) => {
                  const next = [...lines];
                  next[i] = { ...line, categoryId: e.target.value };
                  setLines(next);
                }}
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step={0.01}
                value={line.amount}
                onChange={(e) => {
                  const next = [...lines];
                  next[i] = { ...line, amount: Number(e.target.value) };
                  setLines(next);
                }}
                className="w-24 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="button"
                onClick={() => setLines(lines.filter((_, j) => j !== i))}
                className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setLines([
                ...lines,
                { categoryId: categories[0]?.id ?? "", amount: 0 },
              ])
            }
            className="flex items-center gap-1 text-xs font-medium text-zinc-600"
          >
            <Plus className="h-3.5 w-3.5" /> Add line
          </button>
          <p
            className={`text-xs ${sumOk ? "text-zinc-500" : "text-red-600 dark:text-red-400"}`}
          >
            Total {formatCurrency(lineSum)} / {formatCurrency(parentAmount)}
          </p>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="flex-1 rounded-xl bg-zinc-900 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {saving ? "Saving…" : "Save split"}
            </button>
            {lines.length > 0 ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void clearSplits()}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
