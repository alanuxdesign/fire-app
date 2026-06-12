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
      className="relative w-full rounded-2xl border border-hairline bg-surface p-4 text-left transition-colors hover:bg-canvas-sunken"
    >
      <div className="flex items-center gap-3">
        <Repeat className="h-6 w-6 shrink-0 text-ink-secondary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium text-ink">
              Subscriptions
            </span>
            <span className="shrink-0 text-sm tabular-nums text-ink-secondary">
              {formatCurrency(monthlyTotal)}/mo
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-secondary">
            {confirmedCount} confirmed
            {pendingCount > 0
              ? ` · ${pendingCount} to review`
              : ""}
          </p>
        </div>
        {pendingCount > 0 ? (
          <span
            className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-warn px-1.5 text-xs font-semibold text-on-primary"
            aria-label={`${pendingCount} to review`}
          >
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        ) : null}
      </div>
    </button>
  );
}
