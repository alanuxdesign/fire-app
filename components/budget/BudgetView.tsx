"use client";

import { CelebrateSpot } from "@/components/illustrations/CelebrateSpot";
import { BulkCategorizeBar } from "@/components/budget/BulkCategorizeBar";
import { SubscriptionHomeRow } from "@/components/budget/SubscriptionHomeRow";
import { SubscriptionsDetailView } from "@/components/budget/SubscriptionsDetailView";
import { BucketEditorSheet } from "@/components/budget/BucketEditorSheet";
import { BillsSection } from "@/components/budget/BillsSection";
import { BucketTrendChart } from "@/components/budget/BucketTrendChart";
import { CashFlowChart } from "@/components/budget/CashFlowChart";
import { BudgetIcon } from "@/components/budget/BudgetIcon";
import { BudgetSyncProgress } from "@/components/budget/BudgetSyncProgress";
import { CreateBucketSheet } from "@/components/budget/CreateBucketSheet";
import { TransactionListRow } from "@/components/budget/TransactionListRow";
import { GHOST_BUTTON } from "@/components/ui/cardStyles";
import {
  TransactionDetailSheet,
  type BudgetTag,
} from "@/components/budget/TransactionDetailSheet";
import {
  dismissBudgetAlert,
  isBudgetAlertDismissed,
} from "@/lib/budget-alert-dismissals";
import { useBudgetData } from "@/hooks/useBudgetData";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { shouldAutoSyncTransactions } from "@/lib/budget-sync-policy";
import { shiftBudgetMonth, getCurrentBudgetMonth } from "@/lib/budget-month";
import { syncTransactionsWithProgress } from "@/lib/sync-transactions-client";
import type { TransactionSyncProgress } from "@/lib/transaction-sync-progress";
import type {
  BudgetAlertLevel,
  BudgetCategoryOption,
  BudgetSummary,
  BudgetSummaryBucket,
  CashFlowPoint,
  DuplicateGroup,
  SerializedTransaction,
} from "@/lib/budget-types";
import { formatCurrency } from "@/lib/format";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  RefreshCw,
  Search,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type BudgetViewProps = {
  isDemo?: boolean;
};

type SummaryCardsProps = {
  summary: BudgetSummary;
  isDemo: boolean;
  includePendingInBudget: boolean;
  onTogglePending: () => void;
};

/** "Left to spend" + "Savings rate" cards; rendered inline on mobile and in the desktop sidebar. */
function SummaryCards({
  summary,
  isDemo,
  includePendingInBudget,
  onTogglePending,
}: SummaryCardsProps) {
  return (
    <>
      <div className="mt-4 border-t border-hairline pt-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Room left to spend
            </p>
            <p className="mt-1.5 text-[2rem] font-semibold tabular-nums tracking-[-0.02em] text-ink">
              {formatCurrency(summary.leftToSpend)}
            </p>
          </div>
          {!isDemo ? (
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={includePendingInBudget}
                onChange={onTogglePending}
              />
              Include pending
            </label>
          ) : null}
        </div>
        <p className="mt-1.5 text-sm text-ink-soft">
          {formatCurrency(summary.totalSpent)} spent so far
          {(summary.effectiveBudgetTotal ?? summary.totalTarget) > 0
            ? ` of ${formatCurrency(summary.effectiveBudgetTotal ?? summary.totalTarget)} planned`
            : ""}
          {(summary.billsCommitted ?? 0) > 0
            ? ` · ${formatCurrency(summary.billsCommitted ?? 0)} bills ahead`
            : ""}
        </p>
      </div>

      {summary.savingsRate != null && summary.income > 0 ? (
        <div className="mt-5 border-t border-hairline pt-5">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
            Set aside to grow
          </p>
          <p className="mt-1.5 text-[2rem] font-semibold tabular-nums tracking-[-0.02em] text-sage">
            {Math.round(summary.savingsRate * 100)}%
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            {formatCurrency(summary.income)} came in ·{" "}
            {formatCurrency(summary.totalSpent)} spent
          </p>
        </div>
      ) : null}
    </>
  );
}

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
  // Growth, not scolding: on-track is sage; nearing/over is gentle amber.
  const barColor =
    alertLevel === "over" || over
      ? "bg-amber"
      : alertLevel === "warning"
        ? "bg-amber"
        : "bg-sage";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[14px] px-3 py-3.5 text-left transition-colors hover:bg-sage-wash/50"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-sage-wash text-sage-deep">
          <BudgetIcon name={bucket.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium text-ink">
              {bucket.label}
            </span>
            <span className="shrink-0 text-sm tabular-nums text-ink-soft">
              {credit
                ? `${formatCurrency(Math.abs(bucket.spent))} credit`
                : formatCurrency(bucket.spent)}
              {bucket.target > 0 ? ` · ${formatCurrency(bucket.target)}` : ""}
            </span>
          </div>
          {showAlert ? (
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-amber">
                {alertLevel === "over" ? "A bit over this month" : "Nearing your plan"}
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
                className="text-[10px] text-ink-faint underline"
              >
                Noted
              </button>
            </div>
          ) : null}
          {bucket.target > 0 ? (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-track">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          ) : bucket.spent !== 0 ? (
            <p className="mt-1 text-xs text-ink-faint">No plan set yet</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function BudgetView({ isDemo = false }: BudgetViewProps) {
  const [month, setMonth] = useState(getCurrentBudgetMonth);
  const {
    summary,
    billsDue,
    categories,
    tags,
    subscriptionsSummary,
    loading,
    revalidating,
    error,
    setError,
    setTags,
    refreshMonth,
    refreshAll,
    refreshSubscriptions,
  } = useBudgetData(month);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<TransactionSyncProgress | null>(
    null,
  );
  const [screen, setScreen] = useState<
    | "home"
    | "review"
    | "bucket"
    | "all"
    | "subscriptions"
    | "insights"
    | "duplicates"
  >("home");
  const [activeBucket, setActiveBucket] = useState<BudgetSummaryBucket | null>(null);
  const [transactions, setTransactions] = useState<SerializedTransaction[]>([]);
  const [selectedTxn, setSelectedTxn] = useState<SerializedTransaction | null>(null);
  const [targetInput, setTargetInput] = useState("");
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
  const [cashFlowSeries, setCashFlowSeries] = useState<CashFlowPoint[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);

  const currentMonth = getCurrentBudgetMonth();
  const showBackToToday = month !== currentMonth;

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

  const openInsights = async () => {
    setScreen("insights");
    const res = await fetch("/api/budget/cash-flow?months=12");
    if (res.ok) {
      const body = (await res.json()) as { series: CashFlowPoint[] };
      setCashFlowSeries(body.series);
    }
  };

  const openDuplicates = async () => {
    setScreen("duplicates");
    const res = await fetch("/api/budget/duplicates");
    if (res.ok) {
      const body = (await res.json()) as { groups: DuplicateGroup[] };
      setDuplicateGroups(body.groups);
    }
  };

  const exportCsv = () => {
    if (isDemo) return;
    window.location.href = `/api/budget/export?month=${encodeURIComponent(month)}`;
  };

  const markDuplicate = async (keepId: string, duplicateId: string) => {
    if (isDemo) return;
    await fetch(`/api/transactions/${duplicateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duplicateOfTransactionId: keepId }),
    });
    await openDuplicates();
    await refreshMonth();
  };

  const toggleBucketRollover = async (categoryId: string, enabled: boolean) => {
    if (isDemo) return;
    await fetch(`/api/budget/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rolloverEnabled: enabled }),
    });
    await refreshMonth();
    const updated = summary?.buckets.find((b) => b.id === categoryId);
    if (updated) setActiveBucket(updated);
  };

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
        await refreshAll();
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
  }, [isDemo, refreshAll, fetchSyncStatus, setError]);

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
    const params: Record<string, string> = {
      limit: "200",
      month,
    };
    if (bucket.id) {
      params.categoryId = bucket.id;
    } else if (bucket.slug === "uncategorized") {
      params.virtual = "uncategorized";
    } else if (bucket.slug === "not-counted") {
      params.virtual = "not-counted";
    } else if (bucket.slug === "review") {
      setScreen("review");
      setActiveBucket(null);
      const txns = await loadTransactions({
        reviewStatus: "pending",
        month,
        limit: "200",
      });
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
    const txns = await loadTransactions({
      reviewStatus: "pending",
      month,
      limit: "200",
    });
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
    await refreshMonth();
    if (screen === "review") {
      setTransactions(
        await loadTransactions({
          reviewStatus: "pending",
          month,
          limit: "200",
        }),
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
    await refreshMonth();
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
      await refreshMonth();
      if (screen === "review") {
        setTransactions(
          await loadTransactions({
            reviewStatus: "pending",
            month,
            limit: "200",
          }),
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
      await refreshMonth();
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
    void refreshSubscriptions();
  };

  const openAllTransactions = async (search: string) => {
    setScreen("all");
    setActiveBucket(null);
    const params: Record<string, string> = { limit: "200", month };
    if (search.trim()) params.search = search.trim();
    setTransactions(await loadTransactions(params));
  };

  useEffect(() => {
    if (screen === "bucket" && activeBucket) {
      void openBucket(activeBucket);
    } else if (screen === "review") {
      void openReview();
    } else if (screen === "all") {
      void openAllTransactions(txnSearch);
    }
    // Re-load list views when the selected month changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  useEffect(() => {
    if (summary?.includePendingInBudget !== undefined) {
      setIncludePendingInBudget(summary.includePendingInBudget);
    }
  }, [summary?.includePendingInBudget]);

  const handlePullRefresh = useCallback(async () => {
    if (isDemo) {
      await refreshAll();
      return;
    }
    await runTransactionSync();
  }, [isDemo, refreshAll, runTransactionSync]);

  const {
    bind: pullBind,
    pullDistance,
    refreshing: pullRefreshing,
  } = usePullToRefresh({
    onRefresh: handlePullRefresh,
    enabled: screen === "home",
  });

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
    await refreshMonth();
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
    <div className="flex flex-1 flex-col" {...pullBind}>
      {(pullDistance > 0 || pullRefreshing) && screen === "home" ? (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
          style={{ height: pullRefreshing ? 32 : pullDistance }}
          aria-hidden
        >
          <RefreshCw
            className={`h-4 w-4 text-ink-soft ${pullRefreshing ? "animate-spin" : ""}`}
          />
        </div>
      ) : null}
    <div className="flex flex-1 flex-col px-4 py-4 lg:mx-auto lg:w-full lg:max-w-6xl lg:px-6">
      <div className="flex items-center justify-between gap-2">
        {screen !== "home" ? (
          <button
            type="button"
            onClick={() => {
              setScreen("home");
              setActiveBucket(null);
              setTransactions([]);
            }}
            className="rounded-full p-2 text-ink-soft hover:bg-sage-wash"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : showBackToToday ? (
          <button
            type="button"
            onClick={() => setMonth(currentMonth)}
            className="rounded-full bg-terra-deep px-3 py-1 text-xs font-semibold text-on-primary transition-colors hover:bg-terra"
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
            className="rounded-full p-2 text-ink-soft hover:bg-sage-wash"
            aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[8rem] text-center text-sm font-semibold text-ink">
              {formatMonthLabel(month)}
            </span>
            <button
              type="button"
              onClick={() => setMonth((m) => shiftBudgetMonth(m, 1))}
            className="rounded-full p-2 text-ink-soft hover:bg-sage-wash"
            aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          {showBackToToday ? (
            <p className="text-[10px] text-ink-secondary">Not current month</p>
          ) : revalidating && !syncing ? (
            <p className="text-[10px] text-ink-secondary">Updating…</p>
          ) : lastSyncLabel && !syncing ? (
            <p className="text-[10px] text-ink-secondary">Synced {lastSyncLabel}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {screen === "home" && !isDemo ? (
            <>
              <button
                type="button"
                onClick={() => void exportCsv()}
                className="rounded-full p-2 text-ink-soft hover:bg-sage-wash"
                aria-label="Export CSV"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowCreateBucket(true)}
                className="rounded-full p-2 text-ink-soft hover:bg-sage-wash"
                aria-label="New bucket"
              >
                <Plus className="h-5 w-5" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => void runTransactionSync()}
            disabled={syncing || isDemo}
            className="rounded-full p-2 text-ink-soft hover:bg-sage-wash disabled:opacity-40"
            aria-label="Sync transactions"
          >
            <RefreshCw className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-[14px] bg-[color:var(--ds-sand)] px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {syncing || syncProgress ? (
        <div className="mt-3">
          <BudgetSyncProgress progress={syncProgress} />
        </div>
      ) : null}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
      <div className="min-w-0">
      {screen === "home" && summary ? (
        <>
          <div className="lg:hidden">
            <SummaryCards
              summary={summary}
              isDemo={isDemo}
              includePendingInBudget={includePendingInBudget}
              onTogglePending={() =>
                void toggleIncludePending().catch((e) => setError(String(e)))
              }
            />

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void openInsights()}
                className={`flex-1 text-center ${GHOST_BUTTON}`}
              >
                Cash flow
              </button>
              <button
                type="button"
                onClick={() => void openDuplicates()}
                className={`flex-1 text-center ${GHOST_BUTTON}`}
              >
                Duplicates
              </button>
            </div>

            <BillsSection
              month={formatMonthLabel(month)}
              bills={billsDue}
              categories={categories}
              isDemo={isDemo}
              onChanged={() => refreshMonth()}
            />
          </div>

          {(summary.unreviewedCount ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() => void openReview()}
              className="mt-3 w-full rounded-[14px] bg-sage-wash px-4 py-3 text-left text-sm font-medium text-sage-deep transition-colors hover:opacity-90"
            >
              {summary.unreviewedCount} transaction
              {summary.unreviewedCount === 1 ? "" : "s"} to look over when you have a moment
            </button>
          ) : null}

          <div className="mt-5 divide-y divide-line-soft border-t border-hairline pt-1">
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
            className="mt-4 w-full rounded-full border border-dashed border-hairline-strong px-4 py-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-sage-wash/50"
          >
            See all transactions
          </button>

          {!isDemo ? (
            <p className="mt-6 text-center text-xs text-ink-soft">
              Link accounts in{" "}
              <Link href="/portfolio" className="font-medium text-terra underline">
                Portfolio
              </Link>{" "}
              to keep transactions flowing in.
            </p>
          ) : null}
        </>
      ) : null}

      {screen === "insights" ? (
        <div className="mt-4">
          <h2 className="font-display text-[1.5rem] leading-tight text-ink">
            How the seasons flow
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            What came in against what went out, over the last 12 months
          </p>
          <div className="mt-4">
            <CashFlowChart series={cashFlowSeries} />
          </div>
        </div>
      ) : null}

      {screen === "duplicates" ? (
        <div className="mt-4">
          <h2 className="font-display text-[1.5rem] leading-tight text-ink">
            Possible duplicates
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Same amount and a similar merchant within a day
          </p>
          {duplicateGroups.length === 0 ? (
            <p className="mt-4 text-sm text-ink-secondary">No duplicates found.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {duplicateGroups.map((group) => (
                <li
                  key={group.ids.join("-")}
                  className="rounded-2xl border border-hairline bg-surface p-4"
                >
                  <p className="font-medium text-ink">
                    {group.merchantLabel}
                  </p>
                  <p className="text-sm text-ink-secondary">
                    {formatCurrency(group.amount)} · {group.dates.join(", ")}
                  </p>
                  {!isDemo ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-lg bg-canvas-sunken px-3 py-1.5 text-xs font-medium">
                        Keep first
                      </span>
                      {group.ids.slice(1).map((dupId) => (
                        <button
                          key={dupId}
                          type="button"
                          onClick={() => void markDuplicate(group.ids[0], dupId)}
                          className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium"
                        >
                          Mark other as duplicate
                        </button>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {screen === "subscriptions" ? (
        <div className="mt-4">
          <h2 className="font-display text-[1.5rem] leading-tight text-ink">
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
            <h2 className="font-display text-[1.5rem] leading-tight text-ink">
              A few to look over
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
                    className="text-sm font-medium text-ink-secondary"
                  >
                    {bulkMode ? "Done" : "Select"}
                  </button>
                  <button
                    type="button"
                    disabled={bulkReviewing}
                    onClick={() => void markAllReviewed()}
                    className="text-sm font-medium text-ink-secondary underline disabled:opacity-50"
                  >
                    {bulkReviewing ? "Saving…" : "Mark all reviewed"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CelebrateSpot className="h-24 w-24" />
              <p className="text-sm text-ink-soft">Nothing waiting — a clear and tidy month.</p>
            </div>
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
            <h2 className="font-display text-[1.5rem] leading-tight text-ink">
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
                className="text-sm font-medium text-ink-secondary"
              >
                {bulkMode ? "Done" : "Select"}
              </button>
            ) : null}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={txnSearch}
              onChange={(e) => setTxnSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void openAllTransactions(txnSearch);
              }}
              placeholder="Search merchants…"
              className="w-full rounded-xl border border-hairline bg-surface py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => void openAllTransactions(txnSearch)}
            className="w-full rounded-xl bg-canvas-sunken py-2 text-sm font-medium text-ink"
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
              <BudgetIcon name={activeBucket.icon} className="h-7 w-7 shrink-0 text-ink-secondary" />
              <h2 className="truncate font-display text-[1.5rem] leading-tight text-ink">
                {activeBucket.label}
              </h2>
            </div>
            {activeBucket.id && !activeBucket.isVirtual && !isDemo ? (
              <button
                type="button"
                onClick={() => setShowBucketEditor(true)}
                className="rounded-full p-2 text-ink-soft hover:bg-sage-wash"
                aria-label="Edit bucket"
              >
                <Settings2 className="h-5 w-5" />
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-ink-secondary">
            {activeBucket.target > 0 ? (
              <>
                {activeBucket.spent < 0
                  ? `${formatCurrency(Math.abs(activeBucket.spent))} credit`
                  : `${formatCurrency(activeBucket.spent)} of ${formatCurrency(activeBucket.target)}`}{" "}
                in {formatMonthLabel(month)}
              </>
            ) : (
              <>Transactions in {formatMonthLabel(month)}</>
            )}
          </p>
          {trends.length > 0 ? (
            <div className="mt-4">
              <BucketTrendChart trends={trends} />
            </div>
          ) : null}
          {activeBucket.id && !isDemo ? (
            <label className="mt-3 flex items-center gap-2 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={activeBucket.rolloverEnabled ?? false}
                onChange={(e) =>
                  void toggleBucketRollover(activeBucket.id!, e.target.checked)
                }
              />
              Roll unused budget into next month
            </label>
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
                className="flex-1 rounded-xl border border-hairline bg-surface px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void saveBucketTarget()}
                className="rounded-full bg-terra-deep px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-terra"
              >
                Set plan
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
                  className="text-sm font-medium text-ink-secondary"
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
      </div>

      <aside className="hidden lg:sticky lg:top-6 lg:block">
        {summary ? (
          <>
            <SummaryCards
              summary={summary}
              isDemo={isDemo}
              includePendingInBudget={includePendingInBudget}
              onTogglePending={() =>
                void toggleIncludePending().catch((e) => setError(String(e)))
              }
            />

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void openInsights()}
                className={`flex-1 text-center ${GHOST_BUTTON}`}
              >
                Cash flow
              </button>
              <button
                type="button"
                onClick={() => void openDuplicates()}
                className={`flex-1 text-center ${GHOST_BUTTON}`}
              >
                Duplicates
              </button>
            </div>

            <BillsSection
              month={formatMonthLabel(month)}
              bills={billsDue}
              categories={categories}
              isDemo={isDemo}
              onChanged={() => refreshMonth()}
            />
          </>
        ) : null}
      </aside>
      </div>

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
          onSplitsSaved={async () => {
            await refreshMonth();
            if (activeBucket) await openBucket(activeBucket);
          }}
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
          onCreated={() => refreshAll()}
        />
      ) : null}

      {showBucketEditor && activeBucket?.id ? (
        <BucketEditorSheet
          categoryId={activeBucket.id}
          label={activeBucket.label}
          icon={activeBucket.icon}
          rolloverEnabled={
            categories.find((c) => c.id === activeBucket.id)?.rolloverEnabled ??
            activeBucket.rolloverEnabled
          }
          onClose={() => setShowBucketEditor(false)}
          onSaved={async () => {
            await refreshMonth();
            const updated = summary?.buckets.find((b) => b.id === activeBucket.id);
            if (updated) setActiveBucket(updated);
          }}
          onDeleted={async () => {
            setShowBucketEditor(false);
            setScreen("home");
            setActiveBucket(null);
            setTransactions([]);
            await refreshAll();
          }}
        />
      ) : null}
    </div>
    </div>
  );
}
