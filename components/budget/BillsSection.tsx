"use client";

import type { BudgetCategoryOption, RecurringBill } from "@/lib/budget-types";
import { formatCurrency } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type BillsSectionProps = {
  month: string;
  bills: RecurringBill[];
  categories: BudgetCategoryOption[];
  isDemo?: boolean;
  onChanged: () => Promise<void>;
};

export function BillsSection({
  month,
  bills,
  categories,
  isDemo = false,
  onChanged,
}: BillsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  const addBill = async () => {
    if (!name.trim() || !amount || !dueDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/budget/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          expectedAmount: Number(amount),
          nextDueDate: dueDate,
          categoryId: categoryId || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add bill");
      setName("");
      setAmount("");
      setDueDate("");
      setCategoryId("");
      setShowForm(false);
      await onChanged();
    } finally {
      setSaving(false);
    }
  };

  const removeBill = async (id: string) => {
    if (!window.confirm("Remove this bill?")) return;
    await fetch(`/api/budget/bills/${id}`, { method: "DELETE" });
    await onChanged();
  };

  return (
    <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Bills due this month
        </p>
        {!isDemo ? (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Add bill"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {bills.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No bills scheduled for {month}.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {bills.map((bill) => (
            <li
              key={bill.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                  {bill.name}
                </p>
                <p className="text-xs text-zinc-500">Due {bill.nextDueDate}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(bill.expectedAmount)}
                </span>
                {!isDemo ? (
                  <button
                    type="button"
                    onClick={() => void removeBill(bill.id)}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    aria-label="Remove bill"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && !isDemo ? (
        <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <input
            placeholder="Bill name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">No bucket</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={saving}
            onClick={() => void addBill()}
            className="w-full rounded-xl bg-zinc-900 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? "Adding…" : "Add bill"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
