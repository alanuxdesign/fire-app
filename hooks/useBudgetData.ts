"use client";

import type { BudgetTag } from "@/components/budget/TransactionDetailSheet";
import {
  fetchSubscriptions,
  toSubscriptionsSummary,
  type SubscriptionsSummary,
} from "@/lib/budget-subscriptions";
import {
  BUDGET_REVALIDATE_MS,
  clearPrefetchInFlight,
  getCachedMonth,
  getStaticCache,
  invalidateMonth,
  isMonthStale,
  isStaticStale,
  markPrefetchInFlight,
  setCachedMonth,
  setStaticCache,
} from "@/lib/budget-cache";
import { shiftBudgetMonth } from "@/lib/budget-month";
import type {
  BudgetCategoryOption,
  BudgetSummary,
  RecurringBill,
} from "@/lib/budget-types";
import { useCallback, useEffect, useRef, useState } from "react";

async function fetchSummary(month: string): Promise<BudgetSummary> {
  const res = await fetch(`/api/budget/summary?month=${encodeURIComponent(month)}`);
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Failed to load budget");
  }
  return (await res.json()) as BudgetSummary;
}

async function fetchBills(month: string): Promise<RecurringBill[]> {
  const res = await fetch(`/api/budget/bills?month=${encodeURIComponent(month)}`);
  if (!res.ok) return [];
  const body = (await res.json()) as { bills: RecurringBill[] };
  return body.bills;
}

async function fetchCategories(): Promise<BudgetCategoryOption[]> {
  const res = await fetch("/api/budget/categories?forPicker=1");
  if (!res.ok) return [];
  const body = (await res.json()) as { categories: BudgetCategoryOption[] };
  return body.categories;
}

async function fetchTags(): Promise<BudgetTag[]> {
  const res = await fetch("/api/budget/tags");
  if (!res.ok) return [];
  const body = (await res.json()) as { tags: BudgetTag[] };
  return body.tags;
}

async function fetchSubscriptionsSummary(): Promise<SubscriptionsSummary | null> {
  const data = await fetchSubscriptions();
  if (!data || data.subscriptions.length === 0) return null;
  return toSubscriptionsSummary(data);
}

async function loadMonthData(month: string) {
  const [summary, bills] = await Promise.all([
    fetchSummary(month),
    fetchBills(month),
  ]);
  setCachedMonth(month, { summary, bills });
  return { summary, bills };
}

export function useBudgetData(month: string) {
  const cached = getCachedMonth(month);
  const staticCached = getStaticCache();

  const [summary, setSummary] = useState<BudgetSummary | null>(
    () => cached?.summary ?? null,
  );
  const [billsDue, setBillsDue] = useState<RecurringBill[]>(
    () => cached?.bills ?? [],
  );
  const [categories, setCategories] = useState<BudgetCategoryOption[]>(
    () => staticCached?.categories ?? [],
  );
  const [tags, setTags] = useState<BudgetTag[]>(() => staticCached?.tags ?? []);
  const [subscriptionsSummary, setSubscriptionsSummary] =
    useState<SubscriptionsSummary | null>(
      () => staticCached?.subscriptionsSummary ?? null,
    );
  const [loading, setLoading] = useState(() => !cached);
  const [revalidating, setRevalidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthRef = useRef(month);
  monthRef.current = month;

  const applyMonthData = useCallback(
    (m: string, data: { summary: BudgetSummary; bills: RecurringBill[] }) => {
      if (monthRef.current !== m) return;
      setSummary(data.summary);
      setBillsDue(data.bills);
    },
    [],
  );

  const loadStatic = useCallback(async (background = false) => {
    try {
      const [cats, tagList, subs] = await Promise.all([
        fetchCategories(),
        fetchTags(),
        fetchSubscriptionsSummary(),
      ]);
      setStaticCache({
        categories: cats,
        tags: tagList,
        subscriptionsSummary: subs,
      });
      setCategories(cats);
      setTags(tagList);
      setSubscriptionsSummary(subs);
    } catch (err: unknown) {
      if (!background) {
        throw err;
      }
    }
  }, []);

  const loadMonth = useCallback(
    async (m: string, options: { background?: boolean } = {}) => {
      const { background = false } = options;
      if (!background) {
        setLoading(true);
      } else {
        setRevalidating(true);
      }
      setError(null);

      try {
        const data = await loadMonthData(m);
        applyMonthData(m, data);
        window.dispatchEvent(
          new CustomEvent("budget-review-count", {
            detail: data.summary.unreviewedCount,
          }),
        );
      } catch (err: unknown) {
        if (monthRef.current === m) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
        throw err;
      } finally {
        if (monthRef.current === m) {
          setLoading(false);
          setRevalidating(false);
        }
      }
    },
    [applyMonthData],
  );

  const prefetchMonth = useCallback(async (m: string) => {
    if (!markPrefetchInFlight(m)) return;
    try {
      await loadMonthData(m);
    } catch {
      // Prefetch failures are silent.
    } finally {
      clearPrefetchInFlight(m);
    }
  }, []);

  const refreshMonth = useCallback(
    async (m = monthRef.current) => {
      invalidateMonth(m);
      await loadMonth(m, { background: true });
    },
    [loadMonth],
  );

  const refreshAll = useCallback(async () => {
    invalidateMonth(monthRef.current);
    await Promise.all([
      loadMonth(monthRef.current, { background: false }),
      loadStatic(true),
    ]);
  }, [loadMonth, loadStatic]);

  // Static data once per session (revalidate in background if stale).
  useEffect(() => {
    const existing = getStaticCache();
    if (existing) {
      setCategories(existing.categories);
      setTags(existing.tags);
      setSubscriptionsSummary(existing.subscriptionsSummary);
    }
    if (!existing || isStaticStale()) {
      void loadStatic(true);
    }
  }, [loadStatic]);

  // Month data: show cache instantly, revalidate when stale.
  useEffect(() => {
    const entry = getCachedMonth(month);
    if (entry) {
      setSummary(entry.summary);
      setBillsDue(entry.bills);
      setLoading(false);
      if (isMonthStale(month)) {
        void loadMonth(month, { background: true });
      }
    } else {
      void loadMonth(month, { background: false });
    }

    void prefetchMonth(shiftBudgetMonth(month, -1));
    void prefetchMonth(shiftBudgetMonth(month, 1));
  }, [month, loadMonth, prefetchMonth]);

  // Background revalidate while tab is visible.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (isMonthStale(monthRef.current)) {
        void loadMonth(monthRef.current, { background: true });
      }
      if (isStaticStale()) {
        void loadStatic(true);
      }
    };

    const id = window.setInterval(tick, BUDGET_REVALIDATE_MS);
    return () => window.clearInterval(id);
  }, [loadMonth, loadStatic]);

  const refreshSubscriptions = useCallback(async () => {
    const subs = await fetchSubscriptionsSummary();
    setSubscriptionsSummary(subs);
    const existing = getStaticCache();
    if (existing) {
      setStaticCache({ ...existing, subscriptionsSummary: subs });
    }
  }, []);

  return {
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
    prefetchMonth,
  };
}
