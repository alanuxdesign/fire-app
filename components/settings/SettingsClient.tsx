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
    <div className="flex flex-1 flex-col bg-paper px-5 py-8 lg:mx-auto lg:w-full lg:max-w-3xl lg:px-8">
      <h1 className="font-display text-[2rem] leading-tight tracking-[-0.015em] text-ink">
        Settings
      </h1>

      <div className="mt-7 space-y-8">
        <div className="border-t border-hairline pt-6">
          <p className="font-semibold text-ink">Sync transactions</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Bring in the latest transactions from your linked accounts. New links
            ask for up to 2 years of history; sync also backfills older dates when
            it can. If only a few months show up, reconnect the bank from
            Portfolio so it can reach further back.
          </p>
          <button
            type="button"
            onClick={handleSyncTransactions}
            disabled={txnSyncLoading}
            className="mt-4 w-full rounded-full bg-terra-deep px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-terra disabled:opacity-50"
          >
            {txnSyncLoading ? "Syncing…" : "Sync transactions"}
          </button>
          {txnSyncMessage ? (
            <p className="mt-2 text-sm text-sage">{txnSyncMessage}</p>
          ) : null}
          {txnSyncError ? (
            <p className="mt-2 text-sm text-amber">{txnSyncError}</p>
          ) : null}
        </div>

        <div className="border-t border-hairline pt-6">
          <p className="font-semibold text-ink">Rebuild your history</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Regrow up to 2 years of daily net worth from your transactions.
            Dates that already have a snapshot are left untouched.
          </p>
          <button
            type="button"
            onClick={handleBackfillHistory}
            disabled={backfillLoading}
            className="mt-4 w-full rounded-full bg-terra-deep px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-terra disabled:opacity-50"
          >
            {backfillLoading ? "Rebuilding…" : "Rebuild history"}
          </button>
          {backfillMessage ? (
            <p className="mt-2 text-sm text-sage">{backfillMessage}</p>
          ) : null}
          {backfillError ? (
            <p className="mt-2 text-sm text-amber">{backfillError}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-hairline pt-6">
          <div>
            <p className="font-semibold text-ink">Dark mode</p>
            <p className="text-sm text-ink-soft">
              {theme === "dark" ? "On" : "Off"}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-sage-wash"
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
          className="w-full rounded-full border border-hairline px-4 py-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-sage-wash"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
