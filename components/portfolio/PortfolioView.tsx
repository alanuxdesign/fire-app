"use client";

import { AddAccountButton } from "@/components/portfolio/AddAccountButton";
import { PortfolioHoldings } from "@/components/portfolio/PortfolioHoldings";
import {
  NetWorthChart,
  type NetWorthDisplay,
} from "@/components/portfolio/NetWorthChart";
import { NetWorthHeader } from "@/components/portfolio/NetWorthHeader";
import { PortfolioSkeleton } from "@/components/portfolio/PortfolioSkeleton";
import type { AccountsApiResponse } from "@/lib/account-groups";
import { getChangeHorizonLabel } from "@/lib/chart-data";
import { formatLastUpdated } from "@/lib/format";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const defaultDisplay: NetWorthDisplay = {
  netWorth: 0,
  changePercent: 0,
  changeAmount: 0,
  changeHorizonLabel: getChangeHorizonLabel("YTD"),
  showBackToToday: false,
  isEstimated: false,
};

type PortfolioViewProps = {
  isDemo?: boolean;
};

export function PortfolioView({ isDemo = false }: PortfolioViewProps) {
  const [data, setData] = useState<AccountsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [netWorthDisplay, setNetWorthDisplay] =
    useState<NetWorthDisplay>(defaultDisplay);
  const [snapshotRefreshKey, setSnapshotRefreshKey] = useState(0);
  const backToTodayRef = useRef<() => void>(() => {});

  const loadAccounts = useCallback(async () => {
    const response = await fetch("/api/accounts");
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      throw new Error(body.error ?? "Failed to load accounts");
    }
    return (await response.json()) as AccountsApiResponse;
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const syncResponse = await fetch("/api/plaid/sync-accounts", {
        method: "POST",
      });

      if (!syncResponse.ok) {
        const body = (await syncResponse.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to sync accounts");
      }

      const accounts = await loadAccounts();
      setData(accounts);
      setSnapshotRefreshKey((key) => key + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }, [loadAccounts]);

  useEffect(() => {
    loadAccounts()
      .then((accounts) => {
        setData(accounts);
        setNetWorthDisplay({
          netWorth: accounts.netWorth,
          changePercent: accounts.netWorthChangePercent,
          changeAmount: accounts.netWorthChangeAmount,
          changeHorizonLabel: getChangeHorizonLabel("YTD"),
          showBackToToday: false,
          isEstimated: false,
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load accounts");
      })
      .finally(() => setLoading(false));
  }, [loadAccounts]);

  const applyAccountsToDisplay = useCallback((accounts: AccountsApiResponse) => {
    setData(accounts);
    setSnapshotRefreshKey((key) => key + 1);
    setNetWorthDisplay((prev) => ({
      ...prev,
      netWorth: accounts.netWorth,
      changePercent: accounts.netWorthChangePercent,
      changeAmount: accounts.netWorthChangeAmount,
      isEstimated: false,
    }));
  }, []);

  const reloadAccounts = useCallback(async () => {
    try {
      const accounts = await loadAccounts();
      applyAccountsToDisplay(accounts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    }
  }, [applyAccountsToDisplay, loadAccounts]);

  const handleLinked = useCallback(async () => {
    setRefreshing(true);
    try {
      await reloadAccounts();
    } finally {
      setRefreshing(false);
    }
  }, [reloadAccounts]);

  const handleNetWorthDisplayChange = useCallback((display: NetWorthDisplay) => {
    setNetWorthDisplay(display);
  }, []);

  const lastUpdatedLabel = data?.lastUpdated
    ? formatLastUpdated(new Date(data.lastUpdated))
    : null;

  if (loading) {
    return <PortfolioSkeleton />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="shrink-0 bg-zinc-950 text-white">
        <NetWorthHeader
          netWorth={netWorthDisplay.netWorth}
          changeAmount={netWorthDisplay.changeAmount}
          changePercent={netWorthDisplay.changePercent}
          changeHorizonLabel={netWorthDisplay.changeHorizonLabel}
          showBackToToday={netWorthDisplay.showBackToToday}
          isEstimated={netWorthDisplay.isEstimated}
          onBackToToday={() => backToTodayRef.current()}
        />
        <NetWorthChart
          currentNetWorth={data?.netWorth ?? 0}
          onDisplayChange={handleNetWorthDisplayChange}
          onRegisterBackToToday={(handler) => {
            backToTodayRef.current = handler;
          }}
          refreshKey={snapshotRefreshKey}
        />
      </section>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-stone-100 dark:bg-zinc-950">
        {!isDemo ? (
          <div className="flex items-center justify-end px-4 pt-3">
            <button
              type="button"
              onClick={() => refresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-stone-200/60 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-label="Refresh accounts"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        ) : null}

        <div className="space-y-4 px-4 pb-6">
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}

          {refreshing ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-16 rounded-xl bg-stone-200/80 dark:bg-zinc-900" />
              <div className="h-40 rounded-2xl bg-stone-200/80 dark:bg-zinc-900" />
            </div>
          ) : data ? (
            <PortfolioHoldings
              data={data}
              onAccountsChange={reloadAccounts}
              readOnly={isDemo}
            />
          ) : null}

          {!isDemo ? (
            <AddAccountButton onLinked={handleLinked} disabled={refreshing} />
          ) : null}

          {lastUpdatedLabel ? (
            <p className="pt-2 text-center text-xs text-slate-500 dark:text-zinc-500">
              Last Updated {lastUpdatedLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
