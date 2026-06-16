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
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink">
            {sub.displayName}
          </p>
          <p className="mt-1 text-sm tabular-nums text-ink-secondary">
            {formatCurrency(sub.expectedAmount)}
            <span className="text-ink-secondary"> / {sub.cadence}</span>
          </p>
          {sub.nextExpectedDate ? (
            <p className="mt-1 text-xs text-ink-secondary">
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
                className="rounded-full bg-terra-deep px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-terra disabled:opacity-50"
              >
                Confirm
              </button>
            ) : null}
            <button
              type="button"
              disabled={actingId === sub.id}
              onClick={onDismiss}
              className="rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-ink-secondary disabled:opacity-50"
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
    return <p className="mt-4 text-sm text-ink-secondary">Loading subscriptions…</p>;
  }

  const pending = data?.pending ?? [];
  const confirmed = data?.confirmed ?? [];

  if (pending.length === 0 && confirmed.length === 0) {
    return (
      <p className="mt-4 text-sm text-ink-secondary">
        No subscriptions yet. Sync transactions to detect recurring charges.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="rounded-2xl border border-hairline bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
          Confirmed total
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
          {formatCurrency(data?.monthlyTotal ?? 0)}
          <span className="text-base font-normal text-ink-secondary"> / month</span>
        </p>
        {pending.length > 0 ? (
          <p className="mt-1 text-sm text-warn">
            +{formatCurrency(data?.pendingMonthlyTotal ?? 0)}/mo pending review
          </p>
        ) : null}
      </div>

      {pending.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-ink">
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
          <h3 className="text-sm font-medium text-ink">
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
