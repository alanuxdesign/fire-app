"use client";

import type { ColEstimateResult } from "@/lib/col-estimates";
import type { LifeExpenseCategoryInput } from "@/lib/life-plan";
import { LifePlanPricingSection } from "@/components/life-plan/LifePlanPricingSection";
import { computeAnnualLifeCost } from "@/lib/life-plan";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "@/components/ui/cardStyles";
import { useState } from "react";

const LIFE_CHIPS = [
  "More time with family",
  "Travel",
  "Creative work",
  "Less commuting",
  "A calmer week",
] as const;

export type LifePlanFormValues = {
  label: string;
  phases: { label: string }[];
  categories: LifeExpenseCategoryInput[];
  zipCode: string;
  householdSize: number;
  swr: number;
  inflationRate: number;
  expectedReturn: number;
  targetYear: number | null;
  partTimeIncome: number;
};

type LifePlanFormProps = {
  values: LifePlanFormValues;
  onChange: (values: LifePlanFormValues) => void;
  onSave: () => void | Promise<void>;
  saving?: boolean;
  error?: string | null;
  saveLabel?: string;
};

export function LifePlanForm({
  values,
  onChange,
  onSave,
  saving = false,
  error = null,
  saveLabel = "Save changes",
}: LifePlanFormProps) {
  const [phaseInput, setPhaseInput] = useState("");
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateNotes, setEstimateNotes] = useState<string | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const annualCost = computeAnnualLifeCost(values.categories);

  const patch = (partial: Partial<LifePlanFormValues>) => {
    onChange({ ...values, ...partial });
  };

  const applyLocationEstimate = async () => {
    if (!values.zipCode.trim()) return;
    setEstimateLoading(true);
    setEstimateError(null);
    try {
      const qs = new URLSearchParams({
        zip: values.zipCode.trim(),
        householdSize: String(values.householdSize),
      });
      const res = await fetch(`/api/life-plan/estimate?${qs}`);
      const body = (await res.json()) as {
        estimate?: ColEstimateResult;
        error?: string;
      };
      if (!res.ok || !body.estimate) {
        throw new Error(body.error ?? "Could not estimate for that ZIP");
      }
      patch({ categories: body.estimate.categories });
      setEstimateNotes(
        `${body.estimate.notes.col} ${body.estimate.notes.healthcare}`,
      );
    } catch (err: unknown) {
      setEstimateError(err instanceof Error ? err.message : "Estimate failed");
    } finally {
      setEstimateLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-[1.35rem] leading-tight text-ink">
          Your life
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          The vision everything else is translated from.
        </p>
        <textarea
          value={values.label}
          onChange={(e) => patch({ label: e.target.value })}
          rows={3}
          className="mt-4 w-full resize-none rounded-[18px] border border-hairline bg-paper-2 px-4 py-3 text-[15px] leading-relaxed text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {LIFE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() =>
                patch({
                  label: values.label
                    ? `${values.label} ${chip.toLowerCase()}.`
                    : chip,
                })
              }
              className="rounded-full bg-sage-wash px-3 py-1.5 text-sm font-medium text-sage-deep"
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-hairline pt-8">
        <h2 className="font-display text-[1.35rem] leading-tight text-ink">
          Phases <span className="text-base font-normal text-ink-soft">(optional)</span>
        </h2>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={phaseInput}
            onChange={(e) => setPhaseInput(e.target.value)}
            placeholder="e.g. Sabbatical first"
            className="min-w-0 flex-1 rounded-[18px] border border-hairline bg-paper-2 px-4 py-3 text-[15px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
          />
          <button
            type="button"
            disabled={!phaseInput.trim()}
            onClick={() => {
              patch({ phases: [...values.phases, { label: phaseInput.trim() }] });
              setPhaseInput("");
            }}
            className={`shrink-0 ${GHOST_BUTTON} disabled:opacity-40`}
          >
            Add
          </button>
        </div>
        {values.phases.length > 0 ? (
          <ul className="mt-3 divide-y divide-line-soft">
            {values.phases.map((phase, i) => (
              <li
                key={`${phase.label}-${i}`}
                className="flex items-center justify-between py-2.5 text-sm text-ink"
              >
                {phase.label}
                <button
                  type="button"
                  className="text-xs text-ink-faint underline"
                  onClick={() =>
                    patch({
                      phases: values.phases.filter((_, idx) => idx !== i),
                    })
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <LifePlanPricingSection
        categories={values.categories}
        onCategoriesChange={(categories) => patch({ categories })}
        swr={values.swr}
        inflationRate={values.inflationRate}
        targetYear={values.targetYear}
        onTargetYearChange={(targetYear) => patch({ targetYear })}
        zipCode={values.zipCode}
        householdSize={values.householdSize}
        onZipCodeChange={(zipCode) => patch({ zipCode })}
        onHouseholdSizeChange={(householdSize) => patch({ householdSize })}
        onApplyLocalEstimate={applyLocationEstimate}
        estimateLoading={estimateLoading}
        estimateNote={
          estimateError
            ? estimateError
            : estimateNotes
        }
      />

      {error ? <p className="text-sm text-amber">{error}</p> : null}

      <button
        type="button"
        disabled={saving || !values.label.trim() || annualCost <= 0}
        onClick={() => void onSave()}
        className={`w-full ${PRIMARY_BUTTON} disabled:opacity-40`}
      >
        {saving ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}

export function snapshotToFormValues(
  snapshot: import("@/lib/life-plan-types").LifePlanSnapshot,
): LifePlanFormValues {
  return {
    label: snapshot.plan.label,
    phases: snapshot.plan.phases.map((p) => ({ label: p.label })),
    categories: snapshot.plan.categories.map((c) => ({
      id: c.id,
      label: c.label,
      annualAmount: c.annualAmount,
      isEssential: c.isEssential,
      sortOrder: c.sortOrder,
      budgetCategoryId: c.budgetCategoryId,
    })),
    zipCode: snapshot.plan.zipCode ?? "",
    householdSize: snapshot.plan.householdSize,
    swr: snapshot.plan.swr,
    inflationRate: snapshot.plan.tierAssumptions.inflationRate,
    expectedReturn: snapshot.plan.tierAssumptions.expectedReturn,
    targetYear: snapshot.plan.tierAssumptions.targetYear,
    partTimeIncome: snapshot.plan.tierAssumptions.partTimeIncome,
  };
}
