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
        transactionsFetched?: number;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Backfill failed");
      }

      setBackfillMessage(
        `Added ${body.inserted ?? 0} historical snapshots (${body.skippedExisting ?? 0} dates already had data). Fetched ${body.transactionsFetched ?? 0} transactions.`,
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
    <div className="flex flex-1 flex-col px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-zinc-100">
        Settings
      </h1>

      <div className="mt-6 space-y-3">
        <div className="rounded-2xl border border-stone-200/80 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="font-medium text-slate-900 dark:text-zinc-100">
            Backfill history
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Rebuild up to 2 years of daily net worth from Plaid transactions.
            Existing snapshot dates are not overwritten.
          </p>
          <button
            type="button"
            onClick={handleBackfillHistory}
            disabled={backfillLoading}
            className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {backfillLoading ? "Backfilling…" : "Backfill history"}
          </button>
          {backfillMessage ? (
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
              {backfillMessage}
            </p>
          ) : null}
          {backfillError ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {backfillError}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="font-medium text-slate-900 dark:text-zinc-100">
              Dark mode
            </p>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              {theme === "dark" ? "On" : "Off"}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
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
          className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
