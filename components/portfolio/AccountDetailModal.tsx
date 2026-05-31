"use client";

import { AccountHoldingsList } from "@/components/portfolio/AccountHoldingsList";
import type { AccountListItem } from "@/lib/account-groups";
import {
  accountShowsHoldings,
  type AccountHoldingsResponse,
} from "@/lib/account-holdings";
import { parseCurrencyInput } from "@/lib/currency";
import { formatPurchaseDateLabel, parsePurchaseDateInput } from "@/lib/purchase-date";
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
  readOnly?: boolean;
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
  readOnly = false,
}: AccountDetailModalProps) {
  const [assetClassOverride, setAssetClassOverride] = useState<string>("");
  const [marketSymbol, setMarketSymbol] = useState("");
  const [marketQuantity, setMarketQuantity] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseValue, setPurchaseValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [holdings, setHoldings] = useState<AccountHoldingsResponse | null>(
    null,
  );
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showHoldings = account ? accountShowsHoldings(account) : false;

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
    if (account.purchaseDate) {
      const [year, month, day] = account.purchaseDate.split("-");
      setPurchaseDate(
        year && month && day
          ? `${Number(month)}/${Number(day)}/${year}`
          : account.purchaseDate,
      );
    } else {
      setPurchaseDate("");
    }
    setPurchaseValue(
      account.purchaseValue != null ? String(account.purchaseValue) : "",
    );
    setError(null);
    setHoldings(null);
    setHoldingsError(null);
  }, [account]);

  useEffect(() => {
    if (!account || !showHoldings) {
      return;
    }

    let cancelled = false;

    const loadHoldings = async () => {
      setHoldingsLoading(true);
      setHoldingsError(null);

      try {
        const response = await fetch(`/api/accounts/${account.id}/holdings`);
        const body = (await response.json()) as AccountHoldingsResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(body.error ?? "Failed to load holdings");
        }

        if (!cancelled) {
          setHoldings(body);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setHoldings(null);
          setHoldingsError(
            err instanceof Error ? err.message : "Failed to load holdings",
          );
        }
      } finally {
        if (!cancelled) {
          setHoldingsLoading(false);
        }
      }
    };

    void loadHoldings();

    return () => {
      cancelled = true;
    };
  }, [account, showHoldings]);

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

        if (showHoldings && account) {
          const holdingsResponse = await fetch(
            `/api/accounts/${account.id}/holdings`,
          );
          if (holdingsResponse.ok) {
            setHoldings(
              (await holdingsResponse.json()) as AccountHoldingsResponse,
            );
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [account, onUpdated, showHoldings],
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

  const handleSaveAcquisition = async () => {
    const parsedPurchase = parseCurrencyInput(purchaseValue);
    const parsedPurchaseDate = parsePurchaseDateInput(purchaseDate);
    if (purchaseDate.trim() && !parsedPurchaseDate) {
      setError("Enter a valid purchase date (MM/DD/YYYY, e.g. 2/3/2022).");
      return;
    }
    await patchAccount({
      purchaseDate: parsedPurchaseDate,
      purchaseValue: parsedPurchase,
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

      if (showHoldings) {
        const holdingsResponse = await fetch(
          `/api/accounts/${account.id}/holdings`,
        );
        if (holdingsResponse.ok) {
          setHoldings(
            (await holdingsResponse.json()) as AccountHoldingsResponse,
          );
          setHoldingsError(null);
        }
      }
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
            {account.isManual && account.purchaseDate ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                Purchased {formatPurchaseDateLabel(account.purchaseDate)}
                {account.purchaseValue != null
                  ? ` for ${formatCurrency(account.purchaseValue, account.currency)}`
                  : null}
              </p>
            ) : null}
          </div>

          {showHoldings ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">
                Holdings
              </p>
              {holdingsLoading ? (
                <div className="space-y-2 animate-pulse">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-14 rounded-lg bg-stone-100 dark:bg-zinc-800"
                    />
                  ))}
                </div>
              ) : holdingsError ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  {holdingsError}
                </p>
              ) : holdings ? (
                <AccountHoldingsList
                  data={holdings}
                  currency={account.currency}
                />
              ) : null}
            </div>
          ) : null}

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
              disabled={readOnly}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Use default ({defaultAssetClass})</option>
              {ASSET_CLASS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {!readOnly ? (
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
            ) : null}
          </div>

          {account.isManual ? (
            <div className="space-y-2 rounded-xl border border-stone-200 p-3 dark:border-zinc-700">
              <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">
                Acquisition & history
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Purchase date controls when this asset appears on your net worth
                chart. Value grows from purchase price to current value over
                time. Use <span className="font-medium">MM/DD/YYYY</span> (e.g.
                2/3/2022).
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="detail-purchase-date"
                    className="text-xs text-slate-500"
                  >
                    Purchase date
                  </label>
                  <input
                    id="detail-purchase-date"
                    type="text"
                    inputMode="numeric"
                    value={purchaseDate}
                    onChange={(event) => setPurchaseDate(event.target.value)}
                    placeholder="2/3/2022"
                    disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="detail-purchase-value"
                    className="text-xs text-slate-500"
                  >
                    Purchase price
                  </label>
                  <input
                    id="detail-purchase-value"
                    type="text"
                    inputMode="decimal"
                    value={purchaseValue}
                    onChange={(event) => setPurchaseValue(event.target.value)}
                    placeholder="$0"
                    disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={handleSaveAcquisition}
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Save acquisition details
                </button>
              ) : null}
            </div>
          ) : null}

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
                    disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm uppercase disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
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
                    disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={handleSaveMarket}
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Save market link
                </button>
              ) : null}
            </div>
          ) : null}

          {account.plaidItemId && !readOnly ? (
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

          {!readOnly ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="w-full rounded-lg bg-red-600 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Remove account
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
