"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { setBackfillPending } from "@/lib/backfill-pending";
import { Moon, Sun } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

export function SettingsClient() {
  const { theme, toggleTheme } = useTheme();
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const [txnSyncLoading, setTxnSyncLoading] = useState(false);
  const [txnSyncMessage, setTxnSyncMessage] = useState<string | null>(null);
  const [txnSyncError, setTxnSyncError] = useState<string | null>(null);

  const handleSyncTransactions = async () => {
    setTxnSyncLoading(true);
    setTxnSyncMessage(null);
    setTxnSyncError(null);
    try {
      const response = await fetch("/api/plaid/sync-transactions", {
        method: "POST",
      });
      const body = (await response.json()) as {
        error?: string;
        added?: number;
        modified?: number;
        removed?: number;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "Sync failed");
      }
      setTxnSyncMessage(
        `Synced: ${body.added ?? 0} added, ${body.modified ?? 0} updated, ${body.removed ?? 0} removed.`,
      );
    } catch (err: unknown) {
      setTxnSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setTxnSyncLoading(false);
    }
  };

  const handleBackfillHistory = async () => {
    setBackfillLoading(true);
    setBackfillMessage(null);
    setBackfillError(null);

    try {
      setBackfillPending();
      const response = await fetch("/api/plaid/backfill-history", {
        method: "POST",
      });
      const body = (await response.json()) as {
        error?: string;
        inserted?: number;
        skippedExisting?: number;
        replacedExisting?: number;
        transactionsFetched?: number;
        investmentTransactionsFetched?: number;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Backfill failed");
      }

      const replaced = body.replacedExisting ?? 0;
      const banking = body.transactionsFetched ?? 0;
      const investment = body.investmentTransactionsFetched ?? 0;

      setBackfillMessage(
        replaced > 0
          ? `Rebuilt ${body.inserted ?? 0} daily snapshots (replaced ${replaced} existing). Fetched ${banking} banking and ${investment} investment transactions. Today's snapshot uses live balances.`
          : `Added ${body.inserted ?? 0} historical snapshots (${body.skippedExisting ?? 0} dates already had data). Fetched ${banking} banking and ${investment} investment transactions.`,
      );
    } catch (err: unknown) {
      setBackfillError(
        err instanceof Error ? err.message : "Backfill failed",
      );
    } finally {
      setBackfillLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-4 py-8 lg:mx-auto lg:w-full lg:max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink">
        Settings
      </h1>

      <div className="mt-6 space-y-3">
        <div className="rounded-2xl border border-hairline/80 bg-surface px-4 py-4 shadow-sm">
          <p className="font-medium text-ink">
            Sync transactions
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            Pull the latest transactions from linked accounts into your budget.
            New links request up to 2 years of history; sync also backfills older
            dates when Plaid has them. If you only see a few months, reconnect
            the bank from Portfolio (Add account) so Plaid can extend history.
          </p>
          <button
            type="button"
            onClick={handleSyncTransactions}
            disabled={txnSyncLoading}
            className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {txnSyncLoading ? "Syncing…" : "Sync transactions"}
          </button>
          {txnSyncMessage ? (
            <p className="mt-2 text-sm text-gain">
              {txnSyncMessage}
            </p>
          ) : null}
          {txnSyncError ? (
            <p className="mt-2 text-sm text-loss">
              {txnSyncError}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-hairline/80 bg-surface px-4 py-4 shadow-sm">
          <p className="font-medium text-ink">
            Backfill history
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            Rebuild up to 2 years of daily net worth from Plaid transactions.
            Existing snapshot dates are not overwritten.
          </p>
          <button
            type="button"
            onClick={handleBackfillHistory}
            disabled={backfillLoading}
            className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {backfillLoading ? "Backfilling…" : "Backfill history"}
          </button>
          {backfillMessage ? (
            <p className="mt-2 text-sm text-gain">
              {backfillMessage}
            </p>
          ) : null}
          {backfillError ? (
            <p className="mt-2 text-sm text-loss">
              {backfillError}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-hairline/80 bg-surface px-4 py-4 shadow-sm">
          <div>
            <p className="font-medium text-ink">
              Dark mode
            </p>
            <p className="text-sm text-ink-secondary">
              {theme === "dark" ? "On" : "Off"}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-full bg-canvas px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas-sunken"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => signOut({ redirectTo: "/login" })}
          className="w-full rounded-2xl border border-loss/40 bg-surface px-4 py-3 text-sm font-medium text-loss transition-colors hover:bg-red-50"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
