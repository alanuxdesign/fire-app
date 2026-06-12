"use client";

import { AccountHoldingsList } from "@/components/portfolio/AccountHoldingsList";
import type { AccountListItem } from "@/lib/account-groups";
import {
  accountShowsHoldings,
  type AccountHoldingsResponse,
} from "@/lib/account-holdings";
import { parseCurrencyInput } from "@/lib/currency";
import { formatPurchaseDateLabel, parsePurchaseDateInput } from "@/lib/purchase-date";
import { formatAccountBalance } from "@/lib/account-display";
import { InstitutionAvatar } from "@/components/portfolio/InstitutionAvatar";
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
  const [displayName, setDisplayName] = useState("");
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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [account]);

  useEffect(() => {
    if (!account) {
      return;
    }

    setDisplayName(account.name);
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

  const handleSaveDisplayName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }
    await patchAccount(
      account?.isManual
        ? { name: trimmed }
        : { displayName: trimmed },
    );
  };

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
      className="fixed inset-0 z-[60] flex flex-col bg-black/50 lg:items-center lg:justify-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-detail-title"
        className="flex h-[100dvh] w-full flex-col bg-surface lg:h-auto lg:max-h-[85dvh] lg:max-w-2xl lg:rounded-2xl lg:shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-hairline px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <InstitutionAvatar account={account} />
          <div className="min-w-0 flex-1">
            <p className="mt-0.5 text-sm text-ink-secondary">
              {account.institutionName ?? "Manual entry"}
              {account.subtitle ? ` · ${account.subtitle}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-secondary hover:bg-canvas-sunken"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-5 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="space-y-2">
            <label
              id="account-detail-title"
              htmlFor="account-display-name"
              className="text-xs font-medium uppercase tracking-wide text-ink-secondary"
            >
              Display name
            </label>
            <div className="flex gap-2">
              <input
                id="account-display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={readOnly}
                aria-labelledby="account-detail-title"
                className="min-w-0 flex-1 rounded-lg border border-hairline-strong px-3 py-2 text-base font-semibold text-ink disabled:opacity-60"
              />
              {!readOnly ? (
                <button
                  type="button"
                  onClick={handleSaveDisplayName}
                  disabled={saving}
                  className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  Save
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
              Balance
            </p>
            <p
              className={`mt-1 text-2xl font-semibold tabular-nums ${
                account.group === "Liabilities"
                  ? "text-loss"
                  : "text-ink"
              }`}
            >
              {formatAccountBalance(account)}
            </p>
            {account.isManual && account.purchaseDate ? (
              <p className="mt-1 text-sm text-ink-secondary">
                Purchased {formatPurchaseDateLabel(account.purchaseDate)}
                {account.purchaseValue != null
                  ? ` for ${formatCurrency(account.purchaseValue, account.currency)}`
                  : null}
              </p>
            ) : null}
          </div>

          {showHoldings ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">
                Holdings
              </p>
              {holdingsLoading ? (
                <div className="space-y-2 animate-pulse">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-14 rounded-lg bg-canvas"
                    />
                  ))}
                </div>
              ) : holdingsError ? (
                <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
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

          <div className="flex items-center justify-between rounded-xl bg-canvas-sunken px-3 py-2.5">
            <span className="text-sm text-ink-secondary">
              Status
            </span>
            <span
              className={`text-sm font-medium ${
                account.status === "error"
                  ? "text-loss"
                  : account.status === "connected"
                    ? "text-gain"
                    : "text-ink-secondary"
              }`}
            >
              {STATUS_LABELS[account.status]}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="asset-class-override"
                className="text-sm font-medium text-ink"
              >
                Asset class
              </label>
              {hasOverride ? (
                <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
                  Overridden *
                </span>
              ) : null}
            </div>
            <p className="text-xs text-ink-secondary">
              Default: {defaultAssetClass}
              {hasOverride ? ` · Showing: ${effectiveAssetClass}` : ""}
            </p>
            <select
              id="asset-class-override"
              value={assetClassOverride}
              onChange={(event) => setAssetClassOverride(event.target.value)}
              disabled={readOnly}
              className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm disabled:opacity-60"
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
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  Save class
                </button>
                {hasOverride ? (
                  <button
                    type="button"
                    onClick={handleClearOverride}
                    disabled={saving}
                    className="rounded-lg border border-hairline-strong px-3 py-1.5 text-sm font-medium text-ink-secondary"
                  >
                    Remove override
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {account.isManual ? (
            <div className="space-y-2 rounded-xl border border-hairline p-3">
              <p className="text-sm font-medium text-ink">
                Acquisition & history
              </p>
              <p className="text-xs text-ink-secondary">
                Purchase date controls when this asset appears on your net worth
                chart. Value grows from purchase price to current value over
                time. Use <span className="font-medium">MM/DD/YYYY</span> (e.g.
                2/3/2022).
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="detail-purchase-date"
                    className="text-xs text-ink-secondary"
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
                    className="mt-1 w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm disabled:opacity-60"
                  />
                </div>
                <div>
                  <label
                    htmlFor="detail-purchase-value"
                    className="text-xs text-ink-secondary"
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
                    className="mt-1 w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm disabled:opacity-60"
                  />
                </div>
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={handleSaveAcquisition}
                  disabled={saving}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  Save acquisition details
                </button>
              ) : null}
            </div>
          ) : null}

          {account.isManual ? (
            <div className="space-y-2 rounded-xl border border-hairline p-3">
              <p className="text-sm font-medium text-ink">
                Market-tracked holding
              </p>
              <p className="text-xs text-ink-secondary">
                Link a ticker (e.g. VOO). Price updates when you sync accounts.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="market-symbol"
                    className="text-xs text-ink-secondary"
                  >
                    Symbol
                  </label>
                  <input
                    id="market-symbol"
                    value={marketSymbol}
                    onChange={(event) => setMarketSymbol(event.target.value)}
                    placeholder="VOO"
                    disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm uppercase disabled:opacity-60"
                  />
                </div>
                <div>
                  <label
                    htmlFor="market-quantity"
                    className="text-xs text-ink-secondary"
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
                    className="mt-1 w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm disabled:opacity-60"
                  />
                </div>
              </div>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={handleSaveMarket}
                  disabled={saving}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  Save market link
                </button>
              ) : null}
            </div>
          ) : null}

          {!account.isManual &&
          (account.type === "depository" || account.type === "credit") &&
          !readOnly ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-hairline p-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={!account.excludeFromBudget}
                disabled={saving}
                onChange={(event) =>
                  void patchAccount({ excludeFromBudget: !event.target.checked })
                }
              />
              <span>
                <span className="text-sm font-medium text-ink">
                  Include in budget
                </span>
                <span className="mt-0.5 block text-xs text-ink-secondary">
                  When off, transactions still sync but are hidden from budget
                  totals and lists.
                </span>
              </span>
            </label>
          ) : null}

          {account.plaidItemId && !readOnly ? (
            <div className="space-y-2">
              <p className="text-xs text-ink-secondary">
                Last synced {formatRelativeTime(new Date(account.updatedAt))}
              </p>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || saving}
                className="w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
              >
                {syncing ? "Syncing…" : "Sync now"}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={saving}
                className="w-full rounded-lg border border-loss/40 px-3 py-2 text-sm font-medium text-loss disabled:opacity-50"
              >
                Disconnect institution
              </button>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg bg-loss-soft px-3 py-2 text-sm text-loss">
              {error}
            </p>
          ) : null}

          {!readOnly ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="w-full rounded-lg bg-loss px-3 py-2.5 text-sm font-medium text-on-primary transition-colors hover:opacity-90 disabled:opacity-50"
            >
              Remove account
            </button>
          ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
