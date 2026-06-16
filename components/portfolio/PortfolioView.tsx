"use client";

import { AddAccountButton } from "@/components/portfolio/AddAccountButton";
import { DemoBanner } from "@/components/portfolio/DemoBanner";
import { SunriseHero } from "@/components/illustrations/SunriseHero";
import { PortfolioHoldings } from "@/components/portfolio/PortfolioHoldings";
import {
  NetWorthChart,
  type NetWorthDisplay,
} from "@/components/portfolio/NetWorthChart";
import { NetWorthHeader } from "@/components/portfolio/NetWorthHeader";
import { PORTFOLIO_FLOATING_CARD } from "@/components/portfolio/portfolioStyles";
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
      {isDemo ? <DemoBanner /> : null}

      <section className="relative shrink-0 overflow-hidden bg-gradient-to-b from-(--hero-from) via-(--hero-via) to-(--hero-to) pb-14 pt-2 text-ink">
        <SunriseHero className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />

        <div className="lg:mx-auto lg:w-full lg:max-w-5xl lg:px-6">
          <NetWorthHeader
            netWorth={netWorthDisplay.netWorth}
            changeAmount={netWorthDisplay.changeAmount}
            changePercent={netWorthDisplay.changePercent}
            changeHorizonLabel={netWorthDisplay.changeHorizonLabel}
            showBackToToday={netWorthDisplay.showBackToToday}
            isEstimated={netWorthDisplay.isEstimated}
            onBackToToday={() => backToTodayRef.current()}
            size="hero"
          />

          <div className="relative mx-3 mt-4 overflow-hidden rounded-[18px] bg-surface-raised shadow-card ring-1 ring-hairline lg:mx-0">
            <NetWorthChart
              currentNetWorth={data?.netWorth ?? 0}
              onDisplayChange={handleNetWorthDisplayChange}
              onRegisterBackToToday={(handler) => {
                backToTodayRef.current = handler;
              }}
              refreshKey={snapshotRefreshKey}
            />
          </div>
        </div>
      </section>

      <div className="relative z-10 -mt-10 flex min-h-0 flex-1 flex-col overflow-y-auto bg-canvas">
        {!isDemo ? (
          <div className="flex items-center justify-end px-4 pt-2 lg:mx-auto lg:w-full lg:max-w-5xl lg:px-6">
            <button
              type="button"
              onClick={() => refresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-secondary transition-colors hover:bg-sage-wash disabled:opacity-50"
              aria-label="Refresh accounts"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                strokeWidth={2}
              />
              Refresh
            </button>
          </div>
        ) : null}

        <div className="space-y-5 px-4 pb-8 pt-2 lg:mx-auto lg:w-full lg:max-w-5xl lg:px-6">
          {error ? (
            <div className="rounded-[18px] bg-sage-wash px-4 py-3">
              <p className="text-sm text-sage-deep">{error}</p>
            </div>
          ) : null}

          {refreshing ? (
            <div className="space-y-4 animate-pulse">
              <div className={`h-16 ${PORTFOLIO_FLOATING_CARD}`} />
              <div className={`h-40 ${PORTFOLIO_FLOATING_CARD}`} />
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
            <p className="pt-1 text-center text-[11px] font-medium text-ink-muted">
              Last updated {lastUpdatedLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
