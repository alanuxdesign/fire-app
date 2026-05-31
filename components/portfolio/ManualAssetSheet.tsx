"use client";

import { parseCurrencyInput } from "@/lib/currency";
import { formatPurchaseDateLabel, parsePurchaseDateInput } from "@/lib/purchase-date";
import {
  MANUAL_ASSET_TYPES,
  type ManualAssetType,
} from "@/lib/manual-assets";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

type ManualAssetSheetProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

const inputClassName =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-[15px] text-slate-900 outline-none transition-colors focus:border-slate-500 focus:ring-1 focus:ring-slate-500";

export function ManualAssetSheet({ open, onClose, onSaved }: ManualAssetSheetProps) {
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<ManualAssetType>("other");
  const [currentValue, setCurrentValue] = useState("");
  const [purchaseValue, setPurchaseValue] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function resetForm() {
    setName("");
    setAssetType("other");
    setCurrentValue("");
    setPurchaseValue("");
    setPurchaseDate("");
    setAddress("");
    setNotes("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const parsedCurrent = parseCurrencyInput(currentValue);
      const parsedPurchase = parseCurrencyInput(purchaseValue);
      const effectiveCurrent = parsedCurrent ?? parsedPurchase;

      if (effectiveCurrent === null) {
        throw new Error(
          "Enter a current value or purchase value (e.g. 450000 or $450,000)",
        );
      }

      const parsedPurchaseDate = parsePurchaseDateInput(purchaseDate);
      if (purchaseDate.trim() && !parsedPurchaseDate) {
        throw new Error(
          "Enter a valid purchase date (MM/DD/YYYY, e.g. 2/3/2022).",
        );
      }

      const response = await fetch("/api/assets/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          assetType,
          currentValue: effectiveCurrent,
          purchaseValue: parsedPurchase,
          purchaseDate: parsedPurchaseDate,
          address: assetType === "real_estate" ? address || null : null,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to save asset");
      }

      await onSaved();
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save asset");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-asset-title"
        className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-4">
          <h2
            id="manual-asset-title"
            className="text-lg font-semibold text-slate-900"
          >
            Add asset manually
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-stone-100"
            aria-label="Close form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              Asset name
            </span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClassName}
              placeholder="e.g. Primary residence"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              Asset type
            </span>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as ManualAssetType)}
              className={inputClassName}
            >
              {MANUAL_ASSET_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              Current value{" "}
              <span className="font-normal text-slate-400">
                (uses purchase value if blank)
              </span>
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              className={inputClassName}
              placeholder="$0.00"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              Purchase value{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={purchaseValue}
              onChange={(e) => setPurchaseValue(e.target.value)}
              className={inputClassName}
              placeholder="$0.00"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              Purchase date{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <p className="text-xs text-slate-500">
              Your net worth chart excludes this asset before this date and
              grows from purchase value toward current value over time. Use{" "}
              <span className="font-medium">MM/DD/YYYY</span> (e.g. 2/3/2022).
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              placeholder="2/3/2022"
              className={inputClassName}
              aria-describedby="purchase-date-hint"
            />
            {parsePurchaseDateInput(purchaseDate) ? (
              <p id="purchase-date-hint" className="text-xs text-slate-500">
                Chart starts{" "}
                {formatPurchaseDateLabel(parsePurchaseDateInput(purchaseDate)!)}
              </p>
            ) : null}
          </label>

          {assetType === "real_estate" ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Address{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClassName}
                placeholder="Street, city, state"
              />
            </label>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              Notes{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`${inputClassName} resize-none`}
              placeholder="Additional details"
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 text-[15px] font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Add asset"}
          </button>
        </form>
      </div>
    </div>
  );
}
