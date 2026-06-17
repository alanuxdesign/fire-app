"use client";

import { CoverageMap } from "@/components/planner/CoverageMap";
import { RunwayMeter } from "@/components/planner/RunwayMeter";
import { ShockPlaybook } from "@/components/planner/ShockPlaybook";
import { DownMarketReassurance } from "@/components/planner/DownMarketReassurance";
import { getChangeHorizonLabel } from "@/lib/chart-data";
import type { AccountsApiResponse } from "@/lib/account-groups";
import { GrowthRing } from "@/components/illustrations/GrowthRing";
import { SproutVessel } from "@/components/illustrations/SproutVessel";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "@/components/ui/cardStyles";
import {
  MAX_LIFESTYLE_PLANS,
  type LifePlanBundle,
  type LifePlanListItem,
} from "@/lib/life-plan-types";
import { formatCurrency } from "@/lib/format";
import { Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const SCENARIO_STARTERS = [
  "Stay where we are",
  "Move somewhere cheaper",
  "Coast with part-time",
] as const;

function CompareRow({
  item,
  isSelected,
  onSelect,
}: {
  item: LifePlanListItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const pct = Math.round(item.progressPct * 100);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[18px] px-4 py-3 text-left transition-colors ${
        isSelected ? "bg-sage-wash" : "hover:bg-paper-2"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{item.label}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {formatCurrency(item.annualLifeCost)}/yr · target{" "}
            {formatCurrency(item.target)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-sage">
            {pct}%
          </p>
          {item.isPrimary ? (
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-terra">
              Home
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function PlannerView() {
  const searchParams = useSearchParams();
  const initialPlanId = searchParams.get("planId");

  const [bundle, setBundle] = useState<LifePlanBundle | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [netWorthChangePercent, setNetWorthChangePercent] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async (planId?: string | null) => {
    setError(null);
    try {
      const qs = planId ? `?planId=${encodeURIComponent(planId)}` : "";
      const [res, accountsRes] = await Promise.all([
        fetch(`/api/life-plan${qs}`),
        fetch("/api/accounts"),
      ]);
      if (!res.ok) throw new Error("Failed to load planner");
      const body = (await res.json()) as LifePlanBundle;
      setBundle(body);
      setSelectedPlanId(body.viewedPlanId);

      if (accountsRes.ok) {
        const accounts = (await accountsRes.json()) as AccountsApiResponse;
        setNetWorthChangePercent(accounts.netWorthChangePercent ?? null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(initialPlanId);
  }, [load, initialPlanId]);

  const selectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    void load(planId);
  };

  const createScenario = async (label: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/life-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_scenario",
          label: label.trim(),
          cloneFromPlanId: selectedPlanId ?? bundle?.primaryPlanId,
        }),
      });
      const body = (await res.json()) as LifePlanBundle & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not add lifestyle");
      setBundle(body);
      setSelectedPlanId(body.viewedPlanId);
      setShowAdd(false);
      setNewLabel("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add lifestyle");
    } finally {
      setActionLoading(false);
    }
  };

  const setPrimary = async (planId: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/life-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_primary", planId }),
      });
      const body = (await res.json()) as LifePlanBundle & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not set Home lifestyle");
      setBundle(body);
      setSelectedPlanId(body.viewedPlanId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteScenario = async (planId: string) => {
    const plan = bundle?.plans.find((p) => p.id === planId);
    const confirmed = window.confirm(
      plan?.isPrimary
        ? "Remove this lifestyle? Another scenario will become your Home target."
        : `Remove "${plan?.label ?? "this lifestyle"}"?`,
    );
    if (!confirmed) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/life-plan?planId=${encodeURIComponent(planId)}`,
        { method: "DELETE" },
      );
      const body = (await res.json()) as LifePlanBundle & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not remove lifestyle");
      setBundle(body);
      setSelectedPlanId(body.viewedPlanId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <SproutVessel stage={1} className="h-12 w-12 animate-pulse" />
      </div>
    );
  }

  if (!bundle?.snapshot) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
        <SproutVessel stage={0} className="h-16 w-16" />
        <div>
          <h1 className="font-display text-[1.75rem] leading-tight text-ink">
            Name the life first
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">
            Describe and price the life you&apos;re building toward. Then compare
            a few different lifestyles side by side.
          </p>
        </div>
        <Link href="/name-the-life" className={PRIMARY_BUTTON}>
          Name your life
        </Link>
        <Link href="/life-plan/edit" className={GHOST_BUTTON}>
          Or jump straight to the editor
        </Link>
      </div>
    );
  }

  const snapshot = bundle.snapshot;
  const { plan, derived } = snapshot;
  const freedomPct = Math.round(derived.progressPct * 100);
  const baselineRunway = derived.runway.find((r) => r.scenario === "baseline");
  const canAddMore = (bundle.plans.length ?? 0) < MAX_LIFESTYLE_PLANS;

  return (
    <div className="mx-auto w-full px-5 py-8 sm:px-6 lg:max-w-4xl lg:px-8 xl:max-w-5xl xl:px-10">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
        Planner
      </p>
      <h1 className="mt-1 font-display text-[1.75rem] leading-tight text-ink">
        Planner
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        See what&apos;s taken care of, explore runway levers, and write shock
        playbooks for future-you.
      </p>

      {bundle.plans.length > 1 ? (
        <div className="mt-6 space-y-1 border-t border-hairline pt-6">
          <p className="mb-2 text-xs font-medium text-ink-soft">All lifestyles</p>
          {bundle.plans.map((item) => (
            <CompareRow
              key={item.id}
              item={item}
              isSelected={item.id === selectedPlanId}
              onSelect={() => selectPlan(item.id)}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-hairline pt-6">
        {bundle.plans.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectPlan(item.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              item.id === selectedPlanId
                ? "bg-terra-deep text-on-primary"
                : "bg-sage-wash text-sage-deep"
            }`}
          >
            {item.label}
            {item.isPrimary ? " · Home" : ""}
          </button>
        ))}
        {canAddMore ? (
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-hairline px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-sage-wash"
          >
            <Plus className="h-3.5 w-3.5" />
            Add lifestyle
          </button>
        ) : null}
      </div>

      {showAdd ? (
        <div className="mt-4 rounded-[18px] bg-paper-2 px-4 py-4">
          <p className="text-sm font-medium text-ink">Name this lifestyle</p>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Move to Vermont"
            className="mt-2 w-full rounded-[14px] border border-hairline bg-paper px-3 py-2.5 text-[15px] text-ink"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {SCENARIO_STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => setNewLabel(starter)}
                className="rounded-full bg-sage-wash px-3 py-1 text-xs font-medium text-sage-deep"
              >
                {starter}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={actionLoading || !newLabel.trim()}
              onClick={() => void createScenario(newLabel)}
              className={`flex-1 ${PRIMARY_BUTTON} disabled:opacity-40`}
            >
              {actionLoading ? "Adding…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setNewLabel("");
              }}
              className={GHOST_BUTTON}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <CoverageMap
        embedded
        derived={derived}
        milestoneEvents={plan.milestoneEvents}
        swr={plan.swr}
        partTimeIncome={plan.tierAssumptions.partTimeIncome}
      />

      {netWorthChangePercent != null ? (
        <DownMarketReassurance
          derived={derived}
          accessibleAssets={snapshot.assets.totalAccessible}
          totalAssets={snapshot.assets.totalInvestedLiquid}
          swr={plan.swr}
          partTimeIncomeAnnual={plan.tierAssumptions.partTimeIncome}
          changePercent={netWorthChangePercent}
          changeWindowLabel={getChangeHorizonLabel("1M")}
        />
      ) : null}

      <RunwayMeter
        accessibleAssets={snapshot.assets.totalAccessible}
        totalAssets={snapshot.assets.totalInvestedLiquid}
        swr={plan.swr}
        fullMonthlySpend={derived.fullMonthlySpend}
        essentialMonthlySpend={derived.essentialMonthlyBurn}
        partTimeIncomeAnnual={plan.tierAssumptions.partTimeIncome}
      />

      <ShockPlaybook
        planId={plan.id}
        accessibleAssets={snapshot.assets.totalAccessible}
        totalAssets={snapshot.assets.totalInvestedLiquid}
        swr={plan.swr}
        fullMonthlySpend={derived.fullMonthlySpend}
        essentialMonthlySpend={derived.essentialMonthlyBurn}
        partTimeIncomeAnnual={plan.tierAssumptions.partTimeIncome}
        savedPlans={plan.contingencyPlans}
        onSaved={() => void load(selectedPlanId)}
      />

      <div className="mt-8 border-t border-hairline pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[1.35rem] leading-tight text-ink">
              {plan.label}
            </h2>
            {plan.isPrimary ? (
              <p className="mt-1 text-xs font-medium text-terra">
                Home target · freedom ring
              </p>
            ) : (
              <p className="mt-1 text-xs text-ink-soft">Scenario</p>
            )}
            {plan.zipCode ? (
              <p className="mt-1 text-sm text-ink-soft">
                Based near {plan.zipCode}
                {plan.householdSize > 1
                  ? ` · household of ${plan.householdSize}`
                  : ""}
              </p>
            ) : null}
          </div>
          <Link
            href={`/life-plan/edit?planId=${encodeURIComponent(plan.id)}`}
            className={`shrink-0 ${GHOST_BUTTON}`}
          >
            Edit
          </Link>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="flex items-center gap-5 sm:justify-center lg:justify-start">
            <GrowthRing pct={freedomPct} size={96}>
              <span className="text-lg font-semibold tabular-nums text-ink">
                {freedomPct}%
              </span>
            </GrowthRing>
            <div>
              <p className="text-sm text-ink-soft">Progress to this life</p>
              <p className="mt-1 text-[1.25rem] font-semibold tabular-nums text-ink">
                {formatCurrency(derived.target)}
              </p>
              <p className="text-xs text-ink-faint">to hold it for good</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-xs text-ink-soft">Annual life cost</p>
              <p className="mt-1 font-semibold tabular-nums text-ink">
                {formatCurrency(derived.annualLifeCost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-soft">Runway</p>
              <p className="mt-1 font-semibold tabular-nums text-ink">
                {baselineRunway?.indefinite
                  ? "Open-ended"
                  : `${Math.max(0, Math.floor(baselineRunway?.months ?? 0))} mo`}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          {!plan.isPrimary ? (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void setPrimary(plan.id)}
              className={`inline-flex items-center justify-center gap-2 ${PRIMARY_BUTTON} disabled:opacity-40`}
            >
              <Star className="h-4 w-4" />
              Set as Home target
            </button>
          ) : null}
          {bundle.plans.length > 1 || !plan.isPrimary ? (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void deleteScenario(plan.id)}
              className={`inline-flex items-center justify-center gap-2 ${GHOST_BUTTON} disabled:opacity-40`}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-amber">{error}</p> : null}
    </div>
  );
}
