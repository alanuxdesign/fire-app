"use client";

import type { AccountListItem } from "@/lib/account-groups";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import {
  ASSET_CLASS_OPTIONS,
  getEffectiveAssetClass,
  resolveDefaultAssetClass,
} from "@/lib/portfolio-views";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type AccountDetailModalProps = {
  account: AccountListItem | null;
  onClose: () => void;
  onUpdated: () => void;
};

const STATUS_LABELS: Record<AccountListItem["status"], string> = {
  connected: "Connected",
  manual: "Manual entry",
  error: "Error",
};

export function AccountDetailModal({
  account,
  onClose,
  onUpdated,
}: AccountDetailModalProps) {
  const [assetClassOverride, setAssetClassOverride] = useState<string>("");
  const [marketSymbol, setMarketSymbol] = useState("");
  const [marketQuantity, setMarketQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultAssetClass = account
    ? resolveDefaultAssetClass(account)
    : "Other";
  const effectiveAssetClass = account
    ? getEffectiveAssetClass(account)
    : "Other";
  const hasOverride = Boolean(account?.assetClassOverride);

  useEffect(() => {
    if (!account) {
      return;
    }

    setAssetClassOverride(account.assetClassOverride ?? "");
    setMarketSymbol(account.marketSymbol ?? "");
    setMarketQuantity(
      account.marketQuantity != null ? String(account.marketQuantity) : "",
    );
    setError(null);
  }, [account]);

  useEffect(() => {
    if (!account) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [account, onClose]);

  const patchAccount = useCallback(
    async (body: Record<string, unknown>) => {
      if (!account) {
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/accounts/${account.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to save");
        }

        onUpdated();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [account, onUpdated],
  );

  const handleSaveAssetClass = async () => {
    await patchAccount({
      assetClassOverride: assetClassOverride || null,
    });
  };

  const handleClearOverride = async () => {
    setAssetClassOverride("");
    await patchAccount({ assetClassOverride: null });
  };

  const handleSaveMarket = async () => {
    await patchAccount({
      marketSymbol: marketSymbol.trim() || null,
      marketQuantity: marketQuantity ? Number(marketQuantity) : null,
    });
  };

  const handleSync = async () => {
    if (!account?.plaidItemId) {
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/plaid/items/${account.plaidItemId}/sync`,
        { method: "POST" },
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Sync failed");
      }

      onUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!account?.plaidItemId) {
      return;
    }

    if (
      !window.confirm(
        "Disconnect this institution? Linked accounts will be removed.",
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/plaid/items/${account.plaidItemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to disconnect");
      }

      onUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!account) {
      return;
    }

    if (!window.confirm("Remove this account permanently?")) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to remove");
      }

      onUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setSaving(false);
    }
  };

  if (!account) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-detail-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-stone-200 px-4 py-4 dark:border-zinc-800">
          <div>
            <h2
              id="account-detail-title"
              className="text-lg font-semibold text-slate-900 dark:text-zinc-100"
            >
              {account.name}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
              {account.institutionName ?? "Manual entry"}
              {account.subtitle ? ` · ${account.subtitle}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 hover:bg-stone-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              Balance
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
              {formatCurrency(account.currentBalance, account.currency)}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-zinc-800/60">
            <span className="text-sm text-slate-600 dark:text-zinc-400">
              Status
            </span>
            <span
              className={`text-sm font-medium ${
                account.status === "error"
                  ? "text-red-600 dark:text-red-400"
                  : account.status === "connected"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-700 dark:text-zinc-200"
              }`}
            >
              {STATUS_LABELS[account.status]}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="asset-class-override"
                className="text-sm font-medium text-slate-800 dark:text-zinc-200"
              >
                Asset class
              </label>
              {hasOverride ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  Overridden *
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Default: {defaultAssetClass}
              {hasOverride ? ` · Showing: ${effectiveAssetClass}` : ""}
            </p>
            <select
              id="asset-class-override"
              value={assetClassOverride}
              onChange={(event) => setAssetClassOverride(event.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Use default ({defaultAssetClass})</option>
              {ASSET_CLASS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveAssetClass}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Save class
              </button>
              {hasOverride ? (
                <button
                  type="button"
                  onClick={handleClearOverride}
                  disabled={saving}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-zinc-600 dark:text-zinc-300"
                >
                  Remove override
                </button>
              ) : null}
            </div>
          </div>

          {account.isManual ? (
            <div className="space-y-2 rounded-xl border border-stone-200 p-3 dark:border-zinc-700">
              <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">
                Market-tracked holding
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Link a ticker (e.g. VOO). Price updates when you sync accounts.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="market-symbol"
                    className="text-xs text-slate-500"
                  >
                    Symbol
                  </label>
                  <input
                    id="market-symbol"
                    value={marketSymbol}
                    onChange={(event) => setMarketSymbol(event.target.value)}
                    placeholder="VOO"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm uppercase dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="market-quantity"
                    className="text-xs text-slate-500"
                  >
                    Shares
                  </label>
                  <input
                    id="market-quantity"
                    type="number"
                    min="0"
                    step="any"
                    value={marketQuantity}
                    onChange={(event) =>
                      setMarketQuantity(event.target.value)
                    }
                    placeholder="1"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveMarket}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Save market link
              </button>
            </div>
          ) : null}

          {account.plaidItemId ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Last synced {formatRelativeTime(new Date(account.updatedAt))}
              </p>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || saving}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200"
              >
                {syncing ? "Syncing…" : "Sync now"}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={saving}
                className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400"
              >
                Disconnect institution
              </button>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleRemove}
            disabled={saving}
            className="w-full rounded-lg bg-red-600 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Remove account
          </button>
        </div>
      </div>
    </div>
  );
}
