"use client";

import { PRIMARY_BUTTON } from "@/components/ui/cardStyles";
import {
  DEFAULT_EXPECTED_RETURN,
  DEFAULT_INFLATION_RATE,
  DEFAULT_PART_TIME_INCOME,
  DEFAULT_SWR,
} from "@/lib/life-plan";
import type { LifePlanSnapshot } from "@/lib/life-plan-types";
import { useCallback, useEffect, useState } from "react";

type AssumptionValues = {
  swr: number;
  inflationRate: number;
  expectedReturn: number;
  targetYear: number | null;
  partTimeIncome: number;
};

function snapshotToAssumptions(snapshot: LifePlanSnapshot): AssumptionValues {
  const tier = snapshot.plan.tierAssumptions;
  return {
    swr: snapshot.plan.swr,
    inflationRate: tier.inflationRate,
    expectedReturn: tier.expectedReturn,
    targetYear: tier.targetYear,
    partTimeIncome: tier.partTimeIncome,
  };
}

export function LifePlanAssumptionsSection() {
  const [values, setValues] = useState<AssumptionValues>({
    swr: DEFAULT_SWR,
    inflationRate: DEFAULT_INFLATION_RATE,
    expectedReturn: DEFAULT_EXPECTED_RETURN,
    targetYear: new Date().getFullYear() + 20,
    partTimeIncome: DEFAULT_PART_TIME_INCOME,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPlan, setHasPlan] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/life-plan");
      if (!res.ok) throw new Error("Failed to load life plan");
      const body = (await res.json()) as { snapshot: LifePlanSnapshot | null };
      if (body.snapshot) {
        setValues(snapshotToAssumptions(body.snapshot));
        setHasPlan(true);
      } else {
        setHasPlan(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (partial: Partial<AssumptionValues>) => {
    setValues((prev) => ({ ...prev, ...partial }));
    setMessage(null);
  };

  const save = async () => {
    if (!hasPlan) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/life-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          swr: values.swr,
          tierAssumptions: {
            swr: values.swr,
            inflationRate: values.inflationRate,
            expectedReturn: values.expectedReturn,
            targetYear: values.targetYear,
            partTimeIncome: values.partTimeIncome,
          },
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to save");
      }
      setMessage("Assumptions saved.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-ink-soft">Loading assumptions…</p>
    );
  }

  if (!hasPlan) {
    return (
      <p className="text-sm leading-relaxed text-ink-soft">
        Name your life first — then you can tune withdrawal rate, inflation, and
        Coast assumptions here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Today&apos;s life costs stay in today&apos;s dollars. These assumptions
        shape projections and Coast — not a hidden markup on your life.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-ink-soft">
            Withdrawal rate (hold for good)
          </span>
          <input
            type="number"
            min={0.01}
            max={0.1}
            step={0.005}
            value={values.swr}
            onChange={(e) => patch({ swr: Number(e.target.value) || DEFAULT_SWR })}
            className="mt-1 w-full rounded-[14px] border border-hairline bg-paper-2 px-3 py-2.5 text-[15px] tabular-nums text-ink"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-soft">Inflation (for projections)</span>
          <input
            type="number"
            min={0}
            max={0.15}
            step={0.005}
            value={values.inflationRate}
            onChange={(e) =>
              patch({ inflationRate: Number(e.target.value) || DEFAULT_INFLATION_RATE })
            }
            className="mt-1 w-full rounded-[14px] border border-hairline bg-paper-2 px-3 py-2.5 text-[15px] tabular-nums text-ink"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-soft">
            Real return after inflation (Coast)
          </span>
          <input
            type="number"
            min={0}
            max={0.15}
            step={0.005}
            value={values.expectedReturn}
            onChange={(e) =>
              patch({
                expectedReturn: Number(e.target.value) || DEFAULT_EXPECTED_RETURN,
              })
            }
            className="mt-1 w-full rounded-[14px] border border-hairline bg-paper-2 px-3 py-2.5 text-[15px] tabular-nums text-ink"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-soft">Target year (Coast)</span>
          <input
            type="number"
            min={new Date().getFullYear()}
            max={2100}
            value={values.targetYear ?? ""}
            onChange={(e) =>
              patch({
                targetYear: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="mt-1 w-full rounded-[14px] border border-hairline bg-paper-2 px-3 py-2.5 text-[15px] tabular-nums text-ink"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs text-ink-soft">
            Part-time income while coasting (annual)
          </span>
          <input
            type="number"
            min={0}
            step={1000}
            value={values.partTimeIncome}
            onChange={(e) =>
              patch({
                partTimeIncome: Number(e.target.value) || DEFAULT_PART_TIME_INCOME,
              })
            }
            className="mt-1 w-full rounded-[14px] border border-hairline bg-paper-2 px-3 py-2.5 text-[15px] tabular-nums text-ink"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-amber">{error}</p> : null}
      {message ? <p className="text-sm text-sage">{message}</p> : null}
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className={`w-full sm:w-auto ${PRIMARY_BUTTON} disabled:opacity-40`}
      >
        {saving ? "Saving…" : "Save assumptions"}
      </button>
    </div>
  );
}
