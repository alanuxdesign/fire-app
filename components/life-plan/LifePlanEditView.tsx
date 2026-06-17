"use client";

import {
  LifePlanForm,
  snapshotToFormValues,
  type LifePlanFormValues,
} from "@/components/life-plan/LifePlanForm";
import { GHOST_BUTTON } from "@/components/ui/cardStyles";
import type { LifePlanSnapshot } from "@/lib/life-plan-types";
import { DEFAULT_LIFE_EXPENSE_CATEGORIES } from "@/lib/life-plan-defaults";
import {
  DEFAULT_EXPECTED_RETURN,
  DEFAULT_INFLATION_RATE,
  DEFAULT_SWR,
} from "@/lib/life-plan";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const emptyValues: LifePlanFormValues = {
  label: "",
  phases: [],
  categories: [...DEFAULT_LIFE_EXPENSE_CATEGORIES],
  zipCode: "",
  householdSize: 1,
  swr: DEFAULT_SWR,
  inflationRate: DEFAULT_INFLATION_RATE,
  expectedReturn: DEFAULT_EXPECTED_RETURN,
  targetYear: new Date().getFullYear() + 15,
  partTimeIncome: 12_000,
};

export function LifePlanEditView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdParam = searchParams.get("planId");

  const [values, setValues] = useState<LifePlanFormValues>(emptyValues);
  const [planId, setPlanId] = useState<string | null>(planIdParam);
  const [isPrimary, setIsPrimary] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const qs = planIdParam ? `?planId=${encodeURIComponent(planIdParam)}` : "";
      const res = await fetch(`/api/life-plan${qs}`);
      if (!res.ok) throw new Error("Failed to load life plan");
      const body = (await res.json()) as {
        snapshot: LifePlanSnapshot | null;
      };
      if (body.snapshot) {
        setValues(snapshotToFormValues(body.snapshot));
        setPlanId(body.snapshot.plan.id);
        setIsPrimary(body.snapshot.plan.isPrimary);
        setIsNew(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [planIdParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/life-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: planId ?? undefined,
          label: values.label,
          swr: values.swr,
          zipCode: values.zipCode || null,
          householdSize: values.householdSize,
          categories: values.categories.map((c, index) => ({
            label: c.label,
            annualAmount: c.annualAmount,
            isEssential: c.isEssential,
            sortOrder: index,
            budgetCategoryId: c.budgetCategoryId ?? null,
          })),
          phases: values.phases.map((p, index) => ({
            label: p.label,
            sortOrder: index,
          })),
          tierAssumptions: {
            targetYear: values.targetYear,
          },
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to save");
      }
      router.push(
        planId ? `/planner?planId=${encodeURIComponent(planId)}` : "/planner",
      );
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="px-5 py-16 text-center text-sm text-ink-soft">Loading…</p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-8 lg:max-w-xl lg:px-8">
      <Link
        href={
          planId
            ? `/planner?planId=${encodeURIComponent(planId)}`
            : "/planner"
        }
        className={`mb-6 inline-flex ${GHOST_BUTTON}`}
      >
        Back to Planner
      </Link>
      <h1 className="font-display text-[2rem] leading-tight tracking-[-0.015em] text-ink">
        {isNew ? "Name your life" : "Edit lifestyle"}
      </h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        {isPrimary
          ? "This is your Home target — it drives the freedom ring on Home."
          : "A what-if lifestyle. Set it as Home from Planner when you're ready."}
      </p>
      <div className="mt-8">
        <LifePlanForm
          values={values}
          onChange={setValues}
          onSave={save}
          saving={saving}
          error={error}
          saveLabel={isNew ? "Save life plan" : "Save changes"}
        />
      </div>
    </div>
  );
}
