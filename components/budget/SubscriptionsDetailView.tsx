"use client";

import {
  fetchSubscriptions,
  type SubscriptionItem,
  type SubscriptionsResponse,
} from "@/lib/budget-subscriptions";
import { formatCurrency } from "@/lib/format";
import { useCallback, useEffect, useState } from "react";

type SubscriptionsDetailViewProps = {
  isDemo?: boolean;
  refreshKey?: number;
  onUpdated?: () => void;
};

function SubscriptionCard({
  sub,
  isDemo,
  actingId,
  onConfirm,
  onDismiss,
  showConfirm,
}: {
  sub: SubscriptionItem;
  isDemo: boolean;
  actingId: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
  showConfirm: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            {sub.displayName}
          </p>
          <p className="mt-1 text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
            {formatCurrency(sub.expectedAmount)}
            <span className="text-zinc-500"> / {sub.cadence}</span>
          </p>
          {sub.nextExpectedDate ? (
            <p className="mt-1 text-xs text-zinc-500">
              Next expected {sub.nextExpectedDate}
            </p>
          ) : null}
        </div>
        {!isDemo ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {showConfirm ? (
              <button
                type="button"
                disabled={actingId === sub.id}
                onClick={onConfirm}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Confirm
              </button>
            ) : null}
            <button
              type="button"
              disabled={actingId === sub.id}
              onClick={onDismiss}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300"
            >
              {showConfirm ? "Dismiss" : "Remove"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SubscriptionsDetailView({
  isDemo = false,
  refreshKey = 0,
  onUpdated,
}: SubscriptionsDetailViewProps) {
  const [data, setData] = useState<SubscriptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSubscriptions();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const confirm = async (id: string) => {
    if (isDemo) return;
    setActingId(id);
    try {
      await fetch(`/api/budget/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isConfirmed: true }),
      });
      await load();
      onUpdated?.();
    } finally {
      setActingId(null);
    }
  };

  const dismiss = async (id: string) => {
    if (isDemo) return;
    setActingId(id);
    try {
      await fetch(`/api/budget/subscriptions/${id}`, { method: "DELETE" });
      await load();
      onUpdated?.();
    } finally {
      setActingId(null);
    }
  };

  if (loading && !data) {
    return <p className="mt-4 text-sm text-zinc-500">Loading subscriptions…</p>;
  }

  const pending = data?.pending ?? [];
  const confirmed = data?.confirmed ?? [];

  if (pending.length === 0 && confirmed.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-500">
        No subscriptions yet. Sync transactions to detect recurring charges.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Confirmed total
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {formatCurrency(data?.monthlyTotal ?? 0)}
          <span className="text-base font-normal text-zinc-500"> / month</span>
        </p>
        {pending.length > 0 ? (
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            +{formatCurrency(data?.pendingMonthlyTotal ?? 0)}/mo pending review
          </p>
        ) : null}
      </div>

      {pending.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Needs review ({pending.length})
          </h3>
          {pending.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              isDemo={isDemo}
              actingId={actingId}
              showConfirm
              onConfirm={() => void confirm(sub.id)}
              onDismiss={() => void dismiss(sub.id)}
            />
          ))}
        </div>
      ) : null}

      {confirmed.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Confirmed ({confirmed.length})
          </h3>
          {confirmed.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              isDemo={isDemo}
              actingId={actingId}
              showConfirm={false}
              onConfirm={() => {}}
              onDismiss={() => void dismiss(sub.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
