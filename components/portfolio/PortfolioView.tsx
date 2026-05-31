"use client";

import { AccountGroup } from "@/components/portfolio/AccountGroup";
import { AddAccountButton } from "@/components/portfolio/AddAccountButton";
import {
  NetWorthChart,
  type NetWorthDisplay,
} from "@/components/portfolio/NetWorthChart";
import { NetWorthHeader } from "@/components/portfolio/NetWorthHeader";
import type { AccountsApiResponse } from "@/lib/account-groups";
import { formatLastUpdated } from "@/lib/format";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function PortfolioView() {
  const [data, setData] = useState<AccountsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [netWorthDisplay, setNetWorthDisplay] = useState<NetWorthDisplay>({
    netWorth: 0,
    changePercent: 0,
  });
  const [snapshotRefreshKey, setSnapshotRefreshKey] = useState(0);

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
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load accounts");
      })
      .finally(() => setLoading(false));
  }, [loadAccounts]);

  const handleLinked = useCallback(async () => {
    const accounts = await loadAccounts();
    setData(accounts);
    setNetWorthDisplay({
      netWorth: accounts.netWorth,
      changePercent: 0,
    });
    setSnapshotRefreshKey((key) => key + 1);
  }, [loadAccounts]);

  const handleNetWorthDisplayChange = useCallback((display: NetWorthDisplay) => {
    setNetWorthDisplay(display);
  }, []);

  const lastUpdatedLabel = data?.lastUpdated
    ? formatLastUpdated(new Date(data.lastUpdated))
    : null;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-stone-100">
        <p className="text-sm text-slate-500">Loading portfolio…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="shrink-0 bg-zinc-950 text-white">
        <NetWorthHeader
          netWorth={netWorthDisplay.netWorth}
          changePercent={netWorthDisplay.changePercent}
        />
        <NetWorthChart
          currentNetWorth={data?.netWorth ?? 0}
          onDisplayChange={handleNetWorthDisplayChange}
          refreshKey={snapshotRefreshKey}
        />
      </section>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-stone-100">
        <div className="flex items-center justify-end px-4 pt-3">
          <button
            type="button"
            onClick={() => refresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-stone-200/60 disabled:opacity-50"
            aria-label="Refresh accounts"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="space-y-4 px-4 pb-6">
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {data?.groups.length ? (
            data.groups.map((group) => (
              <AccountGroup key={group.type} group={group} />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-10 text-center">
              <p className="text-sm text-slate-600">
                No accounts yet. Connect a bank or add an asset manually below.
              </p>
            </div>
          )}

          <AddAccountButton onLinked={handleLinked} disabled={refreshing} />

          {lastUpdatedLabel ? (
            <p className="pt-2 text-center text-xs text-slate-500">
              Last Updated {lastUpdatedLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
