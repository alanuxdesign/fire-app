"use client";

import { BudgetIcon } from "@/components/budget/BudgetIcon";
import { SheetShell } from "@/components/ui/SheetShell";
import { BUCKET_ICON_OPTIONS } from "@/lib/budget-icon-options";
import { X } from "lucide-react";
import { useState } from "react";

type BucketEditorSheetProps = {
  categoryId: string;
  label: string;
  icon: string;
  rolloverEnabled?: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onDeleted: () => Promise<void>;
};

export function BucketEditorSheet({
  categoryId,
  label: initialLabel,
  icon: initialIcon,
  rolloverEnabled: initialRollover = false,
  onClose,
  onSaved,
  onDeleted,
}: BucketEditorSheetProps) {
  const [label, setLabel] = useState(initialLabel);
  const [icon, setIcon] = useState(initialIcon);
  const [rolloverEnabled, setRolloverEnabled] = useState(initialRollover);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/budget/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed, icon, rolloverEnabled }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to save");
      }
      await onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (
      !window.confirm(
        "Delete this bucket? Its transactions will move to Uncategorized.",
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/budget/categories/${categoryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to delete");
      }
      await onDeleted();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      zIndexClassName="z-[70]"
      backdropClassName="bg-stone-100/95 dark:bg-zinc-950/95"
    >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit bucket</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <label className="mt-4 block text-sm font-medium">Name</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />

        <p className="mt-4 text-sm font-medium">Icon</p>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {BUCKET_ICON_OPTIONS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setIcon(name)}
              className={`flex items-center justify-center rounded-xl border p-2 ${
                icon === name
                  ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
                  : "border-zinc-200 dark:border-zinc-700"
              }`}
            >
              <BudgetIcon name={name} className="h-5 w-5" />
            </button>
          ))}
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={rolloverEnabled}
            onChange={(e) => setRolloverEnabled(e.target.checked)}
          />
          Roll unused budget into next month
        </label>

        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="mt-6 w-full rounded-2xl bg-zinc-900 py-3 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => void remove()}
          className="mt-3 w-full rounded-2xl border border-red-200 py-3 text-sm font-medium text-red-600 dark:border-red-900/50 dark:text-red-400"
        >
          Delete bucket
        </button>
    </SheetShell>
  );
}
