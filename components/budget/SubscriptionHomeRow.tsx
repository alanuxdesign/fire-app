"use client";

import { formatCurrency } from "@/lib/format";
import { Repeat } from "lucide-react";

type SubscriptionHomeRowProps = {
  monthlyTotal: number;
  confirmedCount: number;
  pendingCount: number;
  onClick: () => void;
};

export function SubscriptionHomeRow({
  monthlyTotal,
  confirmedCount,
  pendingCount,
  onClick,
}: SubscriptionHomeRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80"
    >
      <div className="flex items-center gap-3">
        <Repeat className="h-6 w-6 shrink-0 text-zinc-600 dark:text-zinc-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
              Subscriptions
            </span>
            <span className="shrink-0 text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
              {formatCurrency(monthlyTotal)}/mo
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {confirmedCount} confirmed
            {pendingCount > 0
              ? ` · ${pendingCount} to review`
              : ""}
          </p>
        </div>
        {pendingCount > 0 ? (
          <span
            className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white"
            aria-label={`${pendingCount} to review`}
          >
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        ) : null}
      </div>
    </button>
  );
}
