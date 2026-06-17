"use client";

import { GHOST_BUTTON } from "@/components/ui/cardStyles";
import {
  addRecommendedBucket,
  mergeBudgetIntoLifeCategories,
} from "@/lib/life-plan-budget-sync";
import type { BudgetCategoryAverage } from "@/lib/budget-rollups";
import {
  computeAnnualLifeCost,
  computeFireTargetProjection,
  computeTarget,
  type LifeExpenseCategoryInput,
} from "@/lib/life-plan";
import { formatCurrency } from "@/lib/format";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type LifePlanPricingSectionProps = {
  categories: LifeExpenseCategoryInput[];
  onCategoriesChange: (categories: LifeExpenseCategoryInput[]) => void;
  swr: number;
  inflationRate: number;
  targetYear: number | null;
  onTargetYearChange: (year: number | null) => void;
  /** Optional ZIP block — shown when zip props provided */
  zipCode?: string;
  householdSize?: number;
  onZipCodeChange?: (zip: string) => void;
  onHouseholdSizeChange?: (size: number) => void;
  onApplyLocalEstimate?: () => void | Promise<void>;
  estimateLoading?: boolean;
  estimateNote?: string | null;
  /** Hide section chrome when nested inside another step */
  embedded?: boolean;
};

export function LifePlanPricingSection({
  categories,
  onCategoriesChange,
  swr,
  inflationRate,
  targetYear,
  onTargetYearChange,
  zipCode,
  householdSize,
  onZipCodeChange,
  onHouseholdSizeChange,
  onApplyLocalEstimate,
  estimateLoading = false,
  estimateNote = null,
  embedded = false,
}: LifePlanPricingSectionProps) {
  const [budgetAverages, setBudgetAverages] = useState<BudgetCategoryAverage[]>(
    [],
  );
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState("");

  const loadBudgetAverages = useCallback(async () => {
    try {
      const res = await fetch("/api/life-plan/budget-sync?months=12");
      if (!res.ok) return;
      const body = (await res.json()) as { averages: BudgetCategoryAverage[] };
      setBudgetAverages(body.averages ?? []);
    } catch {
      /* optional — user can still edit manually */
    }
  }, []);

  useEffect(() => {
    void loadBudgetAverages();
  }, [loadBudgetAverages]);

  const annualCost = computeAnnualLifeCost(categories);
  const todayTarget = computeTarget(annualCost, swr);
  const projection = computeFireTargetProjection({
    annualLifeCost: annualCost,
    swr,
    inflationRate,
    targetYear,
  });

  const syncFromBudget = async () => {
    setSyncLoading(true);
    setSyncError(null);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/life-plan/budget-sync?months=12");
      const body = (await res.json()) as {
        averages?: BudgetCategoryAverage[];
        monthsSampled?: number;
        error?: string;
      };
      if (!res.ok || !body.averages) {
        throw new Error(body.error ?? "Could not read your budget history");
      }
      setBudgetAverages(body.averages);
      const merged = mergeBudgetIntoLifeCategories(categories, body.averages);
      onCategoriesChange(merged);
      const withData = body.averages.filter((a) => a.monthsWithSpend > 0);
      setSyncMessage(
        withData.length > 0
          ? `Synced ${withData.length} buckets from your last ${body.monthsSampled ?? 12} months of spending.`
          : "No spending history yet — add budget categories or connect accounts first.",
      );
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncLoading(false);
    }
  };

  const updateCategory = (
    index: number,
    patch: Partial<LifeExpenseCategoryInput>,
  ) => {
    onCategoriesChange(
      categories.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  };

  const removeCategory = (index: number) => {
    onCategoriesChange(
      categories
        .filter((_, i) => i !== index)
        .map((c, i) => ({ ...c, sortOrder: i })),
    );
  };

  const addCustomCategory = () => {
    const label = customLabel.trim();
    if (!label) return;
    onCategoriesChange([
      ...categories,
      {
        label,
        annualAmount: 0,
        isEssential: false,
        sortOrder: categories.length,
      },
    ]);
    setCustomLabel("");
  };

  const recommended = budgetAverages.filter(
    (row) =>
      row.monthsWithSpend > 0 &&
      !categories.some((c) => c.budgetCategoryId === row.budgetCategoryId) &&
      !categories.some(
        (c) => c.label.toLowerCase() === row.label.toLowerCase(),
      ),
  );

  const showLocalEstimate =
    onZipCodeChange != null &&
    onHouseholdSizeChange != null &&
    onApplyLocalEstimate != null;

  return (
    <section className={embedded ? "pt-2" : "border-t border-hairline pt-8"}>
      {!embedded ? (
        <>
          <h2 className="font-display text-[1.35rem] leading-tight text-ink">
            Price the life
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Start from your real budget, then tune. Tag essentials — they power
            runway and lean freedom later.
          </p>
        </>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={syncLoading}
          onClick={() => void syncFromBudget()}
          className={`inline-flex items-center justify-center gap-2 ${GHOST_BUTTON} disabled:opacity-40`}
        >
          <RefreshCw
            className={`h-4 w-4 ${syncLoading ? "animate-spin" : ""}`}
          />
          {syncLoading ? "Syncing…" : "Sync from budget"}
        </button>
        <span className="self-center text-xs text-ink-faint">
          12-month average when history exists
        </span>
      </div>
      {syncMessage ? (
        <p className="mt-2 text-sm text-sage">{syncMessage}</p>
      ) : null}
      {syncError ? (
        <p className="mt-2 text-sm text-amber">{syncError}</p>
      ) : null}

      {recommended.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-ink-soft">
            Budget buckets you can add
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recommended.map((row) => (
              <button
                key={row.budgetCategoryId}
                type="button"
                onClick={() =>
                  onCategoriesChange(
                    addRecommendedBucket(categories, row).map((c, i) => ({
                      ...c,
                      sortOrder: i,
                    })),
                  )
                }
                className="inline-flex items-center gap-1 rounded-full bg-sage-wash px-3 py-1.5 text-sm font-medium text-sage-deep"
              >
                <Plus className="h-3.5 w-3.5" />
                {row.label}
                {row.avgMonthly > 0 ? (
                  <span className="tabular-nums text-ink-soft">
                    · {formatCurrency(row.avgMonthly)}/mo
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showLocalEstimate ? (
        <div className="mt-6 rounded-[18px] bg-sage-wash/50 px-4 py-4">
          <p className="text-sm font-medium text-sage-deep">
            Local suggestions{" "}
            <span className="font-normal text-ink-soft">(optional)</span>
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            ZIP + household size → cost-of-living + typical ACA healthcare for
            your area.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={zipCode ?? ""}
              onChange={(e) =>
                onZipCodeChange!(e.target.value.replace(/\D/g, "").slice(0, 5))
              }
              placeholder="ZIP"
              className="rounded-[14px] border border-hairline bg-paper-2 px-3 py-2 text-[15px] tabular-nums text-ink"
            />
            <input
              type="number"
              min={1}
              max={6}
              value={householdSize ?? 1}
              onChange={(e) =>
                onHouseholdSizeChange!(
                  Math.max(1, Number(e.target.value) || 1),
                )
              }
              className="rounded-[14px] border border-hairline bg-paper-2 px-3 py-2 text-[15px] tabular-nums text-ink"
            />
          </div>
          <button
            type="button"
            disabled={(zipCode?.length ?? 0) < 5 || estimateLoading}
            onClick={() => void onApplyLocalEstimate!()}
            className={`mt-3 w-full text-center ${GHOST_BUTTON} disabled:opacity-40`}
          >
            {estimateLoading ? "Looking up…" : "Apply local suggestions"}
          </button>
          {estimateNote ? (
            <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
              {estimateNote}
            </p>
          ) : null}
        </div>
      ) : null}

      <ul className="mt-6 divide-y divide-line-soft">
        {categories.map((category, index) => (
          <li key={`${category.budgetCategoryId ?? "custom"}-${index}`} className="py-4">
            <div className="flex items-start justify-between gap-3">
              <input
                type="text"
                value={category.label}
                onChange={(e) => updateCategory(index, { label: e.target.value })}
                className="min-w-0 flex-1 rounded-[14px] border border-hairline bg-paper-2 px-3 py-2 text-[15px] font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
              />
              <div className="flex shrink-0 items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={category.isEssential}
                    onChange={(e) =>
                      updateCategory(index, { isEssential: e.target.checked })
                    }
                  />
                  Essential
                </label>
                <button
                  type="button"
                  onClick={() => removeCategory(index)}
                  className="rounded-full p-1.5 text-ink-faint hover:bg-sage-wash hover:text-ink-soft"
                  aria-label={`Remove ${category.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {category.budgetCategoryId ? (
              <p className="mt-1 text-[11px] text-ink-faint">Linked to Budget</p>
            ) : null}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-ink-soft">$</span>
              <input
                type="number"
                min={0}
                step={100}
                value={category.annualAmount}
                onChange={(e) =>
                  updateCategory(index, {
                    annualAmount: Number(e.target.value) || 0,
                  })
                }
                className="w-full rounded-[14px] border border-hairline bg-paper-2 px-3 py-2 text-[15px] tabular-nums text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
              />
              <span className="shrink-0 text-xs text-ink-faint">/ yr</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="Custom category name"
          className="min-w-0 flex-1 rounded-[14px] border border-hairline bg-paper-2 px-3 py-2.5 text-[15px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomCategory();
            }
          }}
        />
        <button
          type="button"
          disabled={!customLabel.trim()}
          onClick={addCustomCategory}
          className={`shrink-0 inline-flex items-center gap-1 ${GHOST_BUTTON} disabled:opacity-40`}
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="mt-8 rounded-[18px] bg-paper-2 px-4 py-4">
        <p className="text-sm tabular-nums text-ink">
          {formatCurrency(annualCost)}/yr today → growing toward{" "}
          {formatCurrency(todayTarget)}
        </p>

        <label className="mt-4 block">
          <span className="text-xs text-ink-soft">
            When do you want to reach this?
          </span>
          <input
            type="number"
            min={new Date().getFullYear()}
            max={2100}
            value={targetYear ?? ""}
            onChange={(e) =>
              onTargetYearChange(
                e.target.value ? Number(e.target.value) : null,
              )
            }
            placeholder={String(new Date().getFullYear() + 20)}
            className="mt-1 w-full rounded-[14px] border border-hairline bg-paper px-3 py-2.5 text-[15px] tabular-nums text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
          />
        </label>

        {projection.yearsToTarget > 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            In {projection.yearsToTarget} years at{" "}
            {(inflationRate * 100).toFixed(1)}% inflation, that life costs about{" "}
            <span className="font-medium tabular-nums text-ink">
              {formatCurrency(projection.futureAnnualCost)}/yr
            </span>{" "}
            — a target near{" "}
            <span className="font-medium tabular-nums text-ink">
              {formatCurrency(projection.futureTarget)}
            </span>
            .
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">
            Pick a target year to see how inflation shifts the number.
          </p>
        )}

        <Link
          href="/settings#life-plan-assumptions"
          className="mt-3 inline-block text-xs font-medium text-terra underline"
        >
          Change inflation & other assumptions in Settings
        </Link>
      </div>
    </section>
  );
}
