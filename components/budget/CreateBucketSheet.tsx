"use client";

import { BudgetIcon } from "@/components/budget/BudgetIcon";
import { SheetShell } from "@/components/ui/SheetShell";
import { BUCKET_ICON_OPTIONS } from "@/lib/budget-icon-options";
import { X } from "lucide-react";
import { useState } from "react";

type CreateBucketSheetProps = {
  onClose: () => void;
  onCreated: () => Promise<void>;
};

export function CreateBucketSheet({ onClose, onCreated }: CreateBucketSheetProps) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState<string>(BUCKET_ICON_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/budget/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed, icon }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to create");
      }
      await onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetShell
      zIndexClassName="z-[70]"
      backdropClassName="bg-canvas/95"
    >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">New bucket</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-canvas-sunken"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-loss">{error}</p>
        ) : null}

        <label className="mt-4 block text-sm font-medium">Name</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Dining out"
          className="mt-1 w-full rounded-xl border border-hairline bg-surface px-3 py-2"
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
                  ? "border-primary bg-primary-soft"
                  : "border-hairline"
              }`}
            >
              <BudgetIcon name={name} className="h-5 w-5" />
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void create()}
          className="mt-6 w-full rounded-2xl bg-primary py-3 font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create bucket"}
        </button>
    </SheetShell>
  );
}
