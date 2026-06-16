import type { BudgetTag } from "@/components/budget/TransactionDetailSheet";
import type { SubscriptionsSummary } from "@/lib/budget-subscriptions";
import type {
  BudgetCategoryOption,
  BudgetSummary,
  RecurringBill,
} from "@/lib/budget-types";

/** Background revalidate interval for cached month data (ms). */
export const BUDGET_REVALIDATE_MS = 10 * 60 * 1000;

export type MonthCacheEntry = {
  summary: BudgetSummary;
  bills: RecurringBill[];
  fetchedAt: number;
};

export type StaticBudgetCache = {
  categories: BudgetCategoryOption[];
  tags: BudgetTag[];
  subscriptionsSummary: SubscriptionsSummary | null;
  fetchedAt: number;
};

const SESSION_STORAGE_KEY = "ember-budget-month-cache";
const SESSION_STORAGE_MAX_MONTHS = 8;

const monthCache = new Map<string, MonthCacheEntry>();
let staticCache: StaticBudgetCache | null = null;
const prefetchInFlight = new Set<string>();

function readSessionMonths(): Record<string, MonthCacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MonthCacheEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSessionMonths(entries: Record<string, MonthCacheEntry>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded or private mode — ignore.
  }
}

function persistMonthToSession(month: string, entry: MonthCacheEntry) {
  const stored = readSessionMonths();
  stored[month] = entry;
  const sorted = Object.entries(stored).sort(
    ([, a], [, b]) => b.fetchedAt - a.fetchedAt,
  );
  const trimmed = Object.fromEntries(sorted.slice(0, SESSION_STORAGE_MAX_MONTHS));
  writeSessionMonths(trimmed);
}

export function getCachedMonth(month: string): MonthCacheEntry | null {
  const mem = monthCache.get(month);
  if (mem) return mem;

  const stored = readSessionMonths()[month];
  if (stored) {
    monthCache.set(month, stored);
    return stored;
  }
  return null;
}

export function setCachedMonth(
  month: string,
  data: Pick<MonthCacheEntry, "summary" | "bills">,
) {
  const entry: MonthCacheEntry = { ...data, fetchedAt: Date.now() };
  monthCache.set(month, entry);
  persistMonthToSession(month, entry);
}

export function invalidateMonth(month: string) {
  monthCache.delete(month);
  const stored = readSessionMonths();
  delete stored[month];
  writeSessionMonths(stored);
}

export function isMonthStale(month: string, now = Date.now()): boolean {
  const entry = getCachedMonth(month);
  if (!entry) return true;
  return now - entry.fetchedAt > BUDGET_REVALIDATE_MS;
}

export function getStaticCache(): StaticBudgetCache | null {
  return staticCache;
}

export function setStaticCache(data: Omit<StaticBudgetCache, "fetchedAt">) {
  staticCache = { ...data, fetchedAt: Date.now() };
}

export function isStaticStale(now = Date.now()): boolean {
  if (!staticCache) return true;
  return now - staticCache.fetchedAt > BUDGET_REVALIDATE_MS;
}

export function markPrefetchInFlight(month: string): boolean {
  if (prefetchInFlight.has(month) || getCachedMonth(month)) return false;
  prefetchInFlight.add(month);
  return true;
}

export function clearPrefetchInFlight(month: string) {
  prefetchInFlight.delete(month);
}
