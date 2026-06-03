"use client";

import { BulkCategorizeBar } from "@/components/budget/BulkCategorizeBar";
import { SubscriptionHomeRow } from "@/components/budget/SubscriptionHomeRow";
import { SubscriptionsDetailView } from "@/components/budget/SubscriptionsDetailView";
import { BucketEditorSheet } from "@/components/budget/BucketEditorSheet";
import { BucketTrendChart } from "@/components/budget/BucketTrendChart";
import { BudgetIcon } from "@/components/budget/BudgetIcon";
import { BudgetSyncProgress } from "@/components/budget/BudgetSyncProgress";
import { CreateBucketSheet } from "@/components/budget/CreateBucketSheet";
import { TransactionListRow } from "@/components/budget/TransactionListRow";
import {
  TransactionDetailSheet,
  type BudgetTag,
} from "@/components/budget/TransactionDetailSheet";
import {
  dismissBudgetAlert,
  isBudgetAlertDismissed,
} from "@/lib/budget-alert-dismissals";
import {
  fetchSubscriptions,
  toSubscriptionsSummary,
  type SubscriptionsSummary,
} from "@/lib/budget-subscriptions";
import { shouldAutoSyncTransactions } from "@/lib/budget-sync-policy";
import { shiftBudgetMonth, getCurrentBudgetMonth } from "@/lib/budget-month";
import { syncTransactionsWithProgress } from "@/lib/sync-transactions-client";
import type { TransactionSyncProgress } from "@/lib/transaction-sync-progress";
import type {
  BudgetAlertLevel,
  BudgetCategoryOption,
  BudgetSummary,
  BudgetSummaryBucket,
  SerializedTransaction,
} from "@/lib/budget-types";
import { formatCurrency } from "@/lib/format";
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Search, Settings2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type BudgetViewProps = {
  isDemo?: boolean;
};

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function BucketRow({
  bucket,
  month,
  onClick,
  onDismissAlert,
}: {
  bucket: BudgetSummaryBucket;
  month: string;
  onClick: () => void;
  onDismissAlert: () => void;
}) {
  const alertLevel = (bucket.alertLevel ?? "none") as BudgetAlertLevel;
  const dismissed =
    bucket.id && alertLevel !== "none"
      ? isBudgetAlertDismissed(month, bucket.id)
      : false;
  const showAlert = alertLevel !== "none" && !dismissed && bucket.id;
  const credit = bucket.spent < 0;
  const progressPct =
    bucket.target > 0
      ? Math.min(100, Math.max(0, bucket.progress * 100))
      : 0;
  const over = bucket.target > 0 && bucket.spent > bucket.target;
  const barColor =
    alertLevel === "over" || over
      ? "bg-red-500"
      : alertLevel === "warning"
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border bg-white p-4 text-left transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 ${
        showAlert
          ? alertLevel === "over"
            ? "border-red-200 dark:border-red-900/50"
            : "border-amber-200 dark:border-amber-900/50"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <BudgetIcon name={bucket.icon} className="h-6 w-6 shrink-0 text-zinc-600 dark:text-zinc-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
              {bucket.label}
            </span>
            <span className="shrink-0 text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
              {credit
                ? `${formatCurrency(Math.abs(bucket.spent))} credit`
                : formatCurrency(bucket.spent)}
              {bucket.target > 0 ? ` · ${formatCurrency(bucket.target)}` : ""}
            </span>
          </div>
          {showAlert ? (
            <div className="mt-1 flex items-center justify-between gap-2">
              <span
                className={`text-xs font-medium ${
                  alertLevel === "over"
                    ? "text-red-700 dark:text-red-400"
                    : "text-amber-700 dark:text-amber-400"
                }`}
              >
                {alertLevel === "over" ? "Over budget" : "80% of budget"}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (bucket.id) {
                    dismissBudgetAlert(month, bucket.id);
                    onDismissAlert();
                  }
                }}
                className="text-[10px] text-zinc-500 underline"
              >
                Dismiss
              </button>
            </div>
          ) : null}
          {bucket.target > 0 ? (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          ) : bucket.spent !== 0 ? (
            <p className="mt-1 text-xs text-zinc-500">No budget set</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function BudgetView({ isDemo = false }: BudgetViewProps) {
  const [month, setMonth] = useState(getCurrentBudgetMonth);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<BudgetCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<TransactionSyncProgress | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<
    "home" | "review" | "bucket" | "all" | "subscriptions"
  >("home");
  const [activeBucket, setActiveBucket] = useState<BudgetSummaryBucket | null>(null);
  const [transactions, setTransactions] = useState<SerializedTransaction[]>([]);
  const [selectedTxn, setSelectedTxn] = useState<SerializedTransaction | null>(null);
  const [targetInput, setTargetInput] = useState("");
  const [tags, setTags] = useState<BudgetTag[]>([]);
  const [trends, setTrends] = useState<
    { month: string; spent: number; target: number }[]
  >([]);
  const [lastSyncLabel, setLastSyncLabel] = useState<string | null>(null);
  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const [showBucketEditor, setShowBucketEditor] = useState(false);
  const [txnSearch, setTxnSearch] = useState("");
  const [bulkReviewing, setBulkReviewing] = useState(false);
  const [includePendingInBudget, setIncludePendingInBudget] = useState(false);
  const [alertDismissTick, setAlertDismissTick] = useState(0);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [subscriptionsRefreshKey, setSubscriptionsRefreshKey] = useState(0);
  const [subscriptionsSummary, setSubscriptionsSummary] =
    useState<SubscriptionsSummary | null>(null);

  const currentMonth = getCurrentBudgetMonth();
  const showBackToToday = month !== currentMonth;

  const loadSummary = useCallback(async (m: string) => {
    const res = await fetch(`/api/budget/summary?month=${encodeURIComponent(m)}`);
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      throw new Error(body.error ?? "Failed to load budget");
    }
    return (await res.json()) as BudgetSummary;
  }, []);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/budget/categories?forPicker=1");
    if (!res.ok) return [];
    const body = (await res.json()) as { categories: BudgetCategoryOption[] };
    return body.categories;
  }, []);

  const loadSubscriptionsSummary = useCallback(async () => {
    const data = await fetchSubscriptions();
    if (!data || data.subscriptions.length === 0) {
      setSubscriptionsSummary(null);
      return;
    }
    setSubscriptionsSummary(toSubscriptionsSummary(data));
  }, []);

  const loadTags = useCallback(async () => {
    const res = await fetch("/api/budget/tags");
    if (!res.ok) return [];
    const body = (await res.json()) as { tags: BudgetTag[] };
    return body.tags;
  }, []);

  const loadTransactions = useCallback(
    async (params: Record<string, string>) => {
      const qs = new URLSearchParams({ ...params, forBudget: "1" });
      const res = await fetch(`/api/transactions?${qs}`);
      if (!res.ok) throw new Error("Failed to load transactions");
      const body = (await res.json()) as { transactions: SerializedTransaction[] };
      return body.transactions;
    },
    [],
  );

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [sum, cats, tagList] = await Promise.all([
        loadSummary(month),
        loadCategories(),
        loadTags(),
        loadSubscriptionsSummary(),
      ]);
      setSummary(sum);
      setCategories(cats);
      setTags(tagList);
      if (sum.includePendingInBudget !== undefined) {
        setIncludePendingInBudget(sum.includePendingInBudget);
      }
      window.dispatchEvent(new CustomEvent("budget-review-count", { detail: sum.unreviewedCount }));
      setSubscriptionsRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [loadSummary, loadCategories, loadTags, loadSubscriptionsSummary, month]);

  const fetchSyncStatus = useCallback(async () => {
    const res = await fetch("/api/plaid/sync-transactions/status");
    if (!res.ok) return null;
    return (await res.json()) as {
      itemCount: number;
      hasSyncedBefore: boolean;
      lastSyncAt: string | null;
    };
  }, []);

  const runTransactionSync = useCallback(async () => {
    if (isDemo) return;
    setSyncing(true);
    setSyncProgress({
      phase: "preparing",
      message: "Starting transaction sync…",
      percent: 3,
      itemsDone: 0,
      itemsTotal: 0,
      pagesDone: 0,
      transactionsProcessed: 0,
    });
    try {
      const result = await syncTransactionsWithProgress((p) => setSyncProgress(p));
      if ("error" in result) {
        setError(result.error);
      } else {
        await refresh();
        const status = await fetchSyncStatus();
        if (status?.lastSyncAt) {
          setLastSyncLabel(
            new Date(status.lastSyncAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
          );
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncProgress(null), 2500);
    }
  }, [isDemo, refresh, fetchSyncStatus]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        await refresh();
        if (!cancelled) setLoading(false);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [month, refresh]);

  useEffect(() => {
    if (isDemo) return;

    let cancelled = false;

    (async () => {
      const status = await fetchSyncStatus();
      if (cancelled || !status) return;

      if (status.lastSyncAt) {
        setLastSyncLabel(
          new Date(status.lastSyncAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        );
      }

      if (shouldAutoSyncTransactions(status)) {
        await runTransactionSync();
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only check stale sync on initial Budget mount, not when changing months.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  const openBucket = async (bucket: BudgetSummaryBucket) => {
    setActiveBucket(bucket);
    setScreen("bucket");
    const params: Record<string, string> = { limit: "200" };
    if (bucket.id) {
      params.categoryId = bucket.id;
    } else if (bucket.slug === "uncategorized") {
      params.virtual = "uncategorized";
    } else if (bucket.slug === "not-counted") {
      params.virtual = "not-counted";
    } else if (bucket.slug === "review") {
      setScreen("review");
      setActiveBucket(null);
      const txns = await loadTransactions({ reviewStatus: "pending", limit: "200" });
      setTransactions(txns);
      return;
    }
    const txns = await loadTransactions(params);
    setTransactions(txns);

    if (bucket.id) {
      const trendRes = await fetch(
        `/api/budget/categories/${bucket.id}/trends?months=12`,
      );
      if (trendRes.ok) {
        const body = (await trendRes.json()) as {
          trends: { month: string; spent: number; target: number }[];
        };
        setTrends(body.trends);
      }
    } else {
      setTrends([]);
    }
  };

  const openReview = async () => {
    setScreen("review");
    setActiveBucket(null);
    const txns = await loadTransactions({ reviewStatus: "pending", limit: "200" });
    setTransactions(txns);
  };

  const saveTransaction = async (options: {
    transaction: SerializedTransaction;
    vendorApplyFuture: boolean;
    vendorApplyRetro: boolean;
    vendorRequiresReview: boolean;
  }) => {
    if (isDemo) return;
    const { transaction: txn, vendorApplyFuture, vendorApplyRetro, vendorRequiresReview } =
      options;
    const categoryId = txn.userCategoryId;
    const res = await fetch(`/api/transactions/${txn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userCategoryId: txn.userCategoryId,
        includeInBudget: txn.includeInBudget,
        note: txn.note,
        tagIds: txn.tagIds,
        reviewStatus: txn.userCategoryId ? "reviewed" : txn.reviewStatus,
      }),
    });
    if (!res.ok) throw new Error("Failed to save");

    if (
      txn.merchantKey &&
      (vendorApplyFuture || vendorApplyRetro || vendorRequiresReview)
    ) {
      await fetch("/api/merchant-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantKey: txn.merchantKey,
          displayName: txn.merchantName ?? txn.name,
          defaultCategoryId: categoryId,
          requiresReview: vendorRequiresReview,
          applyToFuture: vendorApplyFuture,
          applyRetroactive: vendorApplyRetro,
          categoryId,
        }),
      });
    }

    setSelectedTxn(null);
    await refresh();
    if (screen === "review") {
      setTransactions(
        await loadTransactions({ reviewStatus: "pending", limit: "200" }),
      );
    } else if (screen === "all") {
      await openAllTransactions(txnSearch);
    } else if (activeBucket) {
      await openBucket(activeBucket);
    }
  };

  const createTag = async (name: string): Promise<BudgetTag | null> => {
    const res = await fetch("/api/budget/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { tag: BudgetTag };
    setTags((prev) => [...prev, body.tag]);
    return body.tag;
  };

  const toggleIncludePending = async () => {
    if (isDemo) return;
    const next = !includePendingInBudget;
    const res = await fetch("/api/budget/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includePendingInBudget: next }),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    setIncludePendingInBudget(next);
    await refresh();
  };

  const supportsBulkMode =
    screen === "review" ||
    screen === "all" ||
    (screen === "bucket" && activeBucket?.slug === "uncategorized");

  const toggleTxnSelected = (id: string) => {
    setSelectedTxnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyBulkCategorize = async () => {
    if (!bulkCategoryId || selectedTxnIds.size === 0 || isDemo) return;
    setBulkApplying(true);
    setBulkMessage(null);
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [...selectedTxnIds],
          userCategoryId: bulkCategoryId,
          markReviewed: screen === "review",
        }),
      });
      const body = (await res.json()) as { updated?: number; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Bulk update failed");
      setBulkMessage(`Updated ${body.updated ?? 0} transactions`);
      setSelectedTxnIds(new Set());
      setBulkMode(false);
      await refresh();
      if (screen === "review") {
        setTransactions(
          await loadTransactions({ reviewStatus: "pending", limit: "200" }),
        );
      } else if (screen === "all") {
        await openAllTransactions(txnSearch);
      } else if (activeBucket) {
        await openBucket(activeBucket);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setBulkApplying(false);
    }
  };

  const markAllReviewed = async () => {
    if (isDemo) return;
    setBulkReviewing(true);
    try {
      const res = await fetch("/api/budget/review/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllPending: true, markReviewed: true }),
      });
      if (!res.ok) throw new Error("Bulk review failed");
      setTransactions([]);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bulk review failed");
    } finally {
      setBulkReviewing(false);
    }
  };

  const openSubscriptions = () => {
    setScreen("subscriptions");
    setActiveBucket(null);
    setTransactions([]);
    setBulkMode(false);
    setSelectedTxnIds(new Set());
  };

  const handleSubscriptionsUpdated = () => {
    setSubscriptionsRefreshKey((k) => k + 1);
    void loadSubscriptionsSummary();
  };

  const openAllTransactions = async (search: string) => {
    setScreen("all");
    setActiveBucket(null);
    const params: Record<string, string> = { limit: "200" };
    if (search.trim()) params.search = search.trim();
    setTransactions(await loadTransactions(params));
  };

  const saveBucketTarget = async () => {
    if (!activeBucket?.id || isDemo) return;
    const amount = Number(targetInput);
    if (!Number.isFinite(amount) || amount < 0) return;
    await fetch("/api/budget/targets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        categoryId: activeBucket.id,
        amount,
      }),
    });
    await refresh();
    setActiveBucket((b) =>
      b ? { ...b, target: amount, progress: amount > 0 ? b.spent / amount : 0 } : b,
    );
  };

  if (loading && !summary) {
    return (
      <div className="flex flex-1 flex-col px-4 py-8">
        <BudgetSyncProgress progress={syncProgress} initialLoading />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        {screen !== "home" ? (
          <button
            type="button"
            onClick={() => {
              setScreen("home");
              setActiveBucket(null);
              setTransactions([]);
            }}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : showBackToToday ? (
          <button
            type="button"
            onClick={() => setMonth(currentMonth)}
            className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Back to today
          </button>
        ) : (
          <div className="w-[5.5rem]" />
        )}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMonth((m) => shiftBudgetMonth(m, -1))}
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[8rem] text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {formatMonthLabel(month)}
            </span>
            <button
              type="button"
              onClick={() => setMonth((m) => shiftBudgetMonth(m, 1))}
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          {showBackToToday ? (
            <p className="text-[10px] text-zinc-500">Not current month</p>
          ) : lastSyncLabel && !syncing ? (
            <p className="text-[10px] text-zinc-500">Synced {lastSyncLabel}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {screen === "home" && !isDemo ? (
            <button
              type="button"
              onClick={() => setShowCreateBucket(true)}
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="New bucket"
            >
              <Plus className="h-5 w-5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void runTransactionSync()}
            disabled={syncing || isDemo}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
            aria-label="Sync transactions"
          >
            <RefreshCw className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {syncing || syncProgress ? (
        <div className="mt-3">
          <BudgetSyncProgress progress={syncProgress} />
        </div>
      ) : null}

      {screen === "home" && summary ? (
        <>
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Left to spend
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(summary.leftToSpend)}
                </p>
              </div>
              {!isDemo ? (
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={includePendingInBudget}
                    onChange={() => void toggleIncludePending().catch((e) => setError(String(e)))}
                  />
                  Include pending
                </label>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Spent {formatCurrency(summary.totalSpent)}
              {(summary.effectiveBudgetTotal ?? summary.totalTarget) > 0
                ? ` of ${formatCurrency(summary.effectiveBudgetTotal ?? summary.totalTarget)} budgeted`
                : ""}
            </p>
          </div>

          {(summary.unreviewedCount ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() => void openReview()}
              className="mt-3 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
            >
              {summary.unreviewedCount} transaction
              {summary.unreviewedCount === 1 ? "" : "s"} need review
            </button>
          ) : null}

          <div className="mt-4 space-y-2">
            {summary.buckets.map((bucket) => (
              <BucketRow
                key={`${bucket.slug}-${bucket.id ?? ""}-${alertDismissTick}`}
                bucket={bucket}
                month={month}
                onClick={() => void openBucket(bucket)}
                onDismissAlert={() => setAlertDismissTick((t) => t + 1)}
              />
            ))}
            {subscriptionsSummary ? (
              <SubscriptionHomeRow
                monthlyTotal={subscriptionsSummary.monthlyTotal}
                confirmedCount={subscriptionsSummary.confirmedCount}
                pendingCount={subscriptionsSummary.pendingCount}
                onClick={openSubscriptions}
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => void openAllTransactions("")}
            className="mt-3 w-full rounded-2xl border border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            All transactions
          </button>

          {!isDemo ? (
            <p className="mt-6 text-center text-xs text-zinc-500">
              Connect accounts in{" "}
              <Link href="/portfolio" className="font-medium text-zinc-700 underline dark:text-zinc-300">
                Portfolio
              </Link>{" "}
              to sync transactions.
            </p>
          ) : null}
        </>
      ) : null}

      {screen === "subscriptions" ? (
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Subscriptions
          </h2>
          <SubscriptionsDetailView
            isDemo={isDemo}
            refreshKey={subscriptionsRefreshKey}
            onUpdated={handleSubscriptionsUpdated}
          />
        </div>
      ) : null}

      {screen === "review" ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Needs review
            </h2>
            <div className="flex items-center gap-2">
              {transactions.length > 0 && !isDemo ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkMode((m) => !m);
                      setSelectedTxnIds(new Set());
                      setBulkMessage(null);
                    }}
                    className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    {bulkMode ? "Done" : "Select"}
                  </button>
                  <button
                    type="button"
                    disabled={bulkReviewing}
                    onClick={() => void markAllReviewed()}
                    className="text-sm font-medium text-zinc-600 underline disabled:opacity-50 dark:text-zinc-400"
                  >
                    {bulkReviewing ? "Saving…" : "Mark all reviewed"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-zinc-500">You&apos;re all caught up.</p>
          ) : (
            transactions.map((txn) => (
              <TransactionListRow
                key={txn.id}
                transaction={txn}
                bulkMode={bulkMode}
                selected={selectedTxnIds.has(txn.id)}
                onToggleSelect={() => toggleTxnSelected(txn.id)}
                onClick={() => {
                  if (bulkMode) toggleTxnSelected(txn.id);
                  else setSelectedTxn(txn);
                }}
              />
            ))
          )}
        </div>
      ) : null}

      {screen === "all" ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              All transactions
            </h2>
            {!isDemo ? (
              <button
                type="button"
                onClick={() => {
                  setBulkMode((m) => !m);
                  setSelectedTxnIds(new Set());
                  setBulkMessage(null);
                }}
                className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
              >
                {bulkMode ? "Done" : "Select"}
              </button>
            ) : null}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={txnSearch}
              onChange={(e) => setTxnSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void openAllTransactions(txnSearch);
              }}
              placeholder="Search merchants…"
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <button
            type="button"
            onClick={() => void openAllTransactions(txnSearch)}
            className="w-full rounded-xl bg-zinc-100 py-2 text-sm font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
          >
            Search
          </button>
          <div className="space-y-2">
            {transactions.map((txn) => (
              <TransactionListRow
                key={txn.id}
                transaction={txn}
                bulkMode={bulkMode}
                selected={selectedTxnIds.has(txn.id)}
                onToggleSelect={() => toggleTxnSelected(txn.id)}
                onClick={() => {
                  if (bulkMode) toggleTxnSelected(txn.id);
                  else setSelectedTxn(txn);
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {screen === "bucket" && activeBucket ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <BudgetIcon name={activeBucket.icon} className="h-7 w-7 shrink-0 text-zinc-600" />
              <h2 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {activeBucket.label}
              </h2>
            </div>
            {activeBucket.id && !activeBucket.isVirtual && !isDemo ? (
              <button
                type="button"
                onClick={() => setShowBucketEditor(true)}
                className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Edit bucket"
              >
                <Settings2 className="h-5 w-5" />
              </button>
            ) : null}
          </div>
          {activeBucket.target > 0 ? (
            <p className="mt-1 text-sm text-zinc-500">
              {activeBucket.spent < 0
                ? `${formatCurrency(Math.abs(activeBucket.spent))} credit`
                : `${formatCurrency(activeBucket.spent)} of ${formatCurrency(activeBucket.target)}`}{" "}
              this month
            </p>
          ) : null}
          {trends.length > 0 ? (
            <div className="mt-4">
              <BucketTrendChart trends={trends} />
            </div>
          ) : null}
          {activeBucket.id && !isDemo ? (
            <div className="mt-3 flex gap-2">
              <input
                type="number"
                min={0}
                step={1}
                placeholder="Monthly budget"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="button"
                onClick={() => void saveBucketTarget()}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Set target
              </button>
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            {activeBucket.slug === "uncategorized" && !isDemo ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setBulkMode((m) => !m);
                    setSelectedTxnIds(new Set());
                    setBulkMessage(null);
                  }}
                  className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
                >
                  {bulkMode ? "Done selecting" : "Select multiple"}
                </button>
              </div>
            ) : null}
            {transactions.map((txn) => (
              <TransactionListRow
                key={txn.id}
                transaction={txn}
                bulkMode={bulkMode && activeBucket.slug === "uncategorized"}
                selected={selectedTxnIds.has(txn.id)}
                onToggleSelect={() => toggleTxnSelected(txn.id)}
                onClick={() => {
                  if (bulkMode && activeBucket.slug === "uncategorized") {
                    toggleTxnSelected(txn.id);
                  } else {
                    setSelectedTxn(txn);
                  }
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {selectedTxn ? (
        <TransactionDetailSheet
          key={selectedTxn.id}
          transaction={selectedTxn}
          categories={categories}
          tags={tags}
          isDemo={isDemo}
          onClose={() => setSelectedTxn(null)}
          onSave={async (opts) => {
            try {
              await saveTransaction(opts);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to save");
            }
          }}
          onCreateTag={createTag}
        />
      ) : null}

      {supportsBulkMode && bulkMode ? (
        <BulkCategorizeBar
          selectedCount={selectedTxnIds.size}
          categories={categories}
          categoryId={bulkCategoryId}
          onCategoryChange={setBulkCategoryId}
          onApply={() => void applyBulkCategorize()}
          onClear={() => setSelectedTxnIds(new Set())}
          applying={bulkApplying}
          message={bulkMessage}
        />
      ) : null}

      {showCreateBucket ? (
        <CreateBucketSheet
          onClose={() => setShowCreateBucket(false)}
          onCreated={refresh}
        />
      ) : null}

      {showBucketEditor && activeBucket?.id ? (
        <BucketEditorSheet
          categoryId={activeBucket.id}
          label={activeBucket.label}
          icon={activeBucket.icon}
          onClose={() => setShowBucketEditor(false)}
          onSaved={async () => {
            await refresh();
            const updated = summary?.buckets.find((b) => b.id === activeBucket.id);
            if (updated) setActiveBucket(updated);
          }}
          onDeleted={async () => {
            setShowBucketEditor(false);
            setScreen("home");
            setActiveBucket(null);
            setTransactions([]);
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}
