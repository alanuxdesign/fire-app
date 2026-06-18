"use client";

import { RunwayMeter } from "@/components/planner/RunwayMeter";
import { PRIMARY_BUTTON, QUIET_BUTTON } from "@/components/ui/cardStyles";
import {
  buildContingencyPlanSummary,
  CONTINGENCY_SCENARIOS,
  parseContingencyLevers,
  serializeContingencyLevers,
  type ContingencyLevers,
  type ContingencyScenario,
} from "@/lib/life-plan-contingency";
import { computeRunwayWithLevers } from "@/lib/life-plan";
import { formatCoverageDate, formatRunwayHeadline } from "@/lib/life-plan-display";
import type { SerializedContingencyPlan } from "@/lib/life-plan-types";
import { Check, ChevronDown } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

type ShockPlaybookProps = {
  planId: string;
  accessibleAssets: number;
  totalAssets: number;
  swr: number;
  fullMonthlySpend: number;
  essentialMonthlySpend: number;
  partTimeIncomeAnnual: number;
  savedPlans: SerializedContingencyPlan[];
  onSaved: () => void;
};

export function ShockPlaybook({
  planId,
  accessibleAssets,
  totalAssets,
  swr,
  fullMonthlySpend,
  essentialMonthlySpend,
  partTimeIncomeAnnual,
  savedPlans,
  onSaved,
}: ShockPlaybookProps) {
  const [expanded, setExpanded] = useState<ContingencyScenario | null>(
    "job_loss",
  );
  const [saving, setSaving] = useState<ContingencyScenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  const savedByScenario = useMemo(() => {
    const map = new Map<string, SerializedContingencyPlan>();
    for (const plan of savedPlans) {
      if (
        plan.scenario === "job_loss" ||
        plan.scenario === "big_expense" ||
        plan.scenario === "downturn"
      ) {
        map.set(plan.scenario, plan);
      }
    }
    return map;
  }, [savedPlans]);

  const [drafts, setDrafts] = useState<
    Record<ContingencyScenario, ContingencyLevers>
  >(() => {
    const initial = {} as Record<ContingencyScenario, ContingencyLevers>;
    for (const s of CONTINGENCY_SCENARIOS) {
      const saved = savedPlans.find((p) => p.scenario === s.id);
      initial[s.id] = parseContingencyLevers(saved?.levers);
    }
    return initial;
  });

  const runwayFor = useCallback(
    (levers: ContingencyLevers) => {
      const result = computeRunwayWithLevers({
        accessibleAssets,
        totalAssets,
        swr,
        fullMonthlySpend,
        essentialMonthlySpend,
        partTimeIncomeAnnual,
        levers: {
          cutToEssentials: levers.cutToEssentials,
          partTime: levers.partTime,
        },
      });
      return { months: result.months, indefinite: result.indefinite };
    },
    [
      accessibleAssets,
      totalAssets,
      swr,
      fullMonthlySpend,
      essentialMonthlySpend,
      partTimeIncomeAnnual,
    ],
  );

  const savePlan = async (scenario: ContingencyScenario) => {
    setSaving(scenario);
    setError(null);
    const levers = drafts[scenario];
    try {
      const res = await fetch("/api/life-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_contingency",
          planId,
          contingency: {
            scenario,
            levers: serializeContingencyLevers(levers),
          },
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not save plan");
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const savedCount = CONTINGENCY_SCENARIOS.filter((s) =>
    savedByScenario.has(s.id),
  ).length;

  return (
    <section
      id="playbooks"
      className="mt-8 border-t border-hairline pt-8"
      aria-label="Shock playbooks"
    >
      <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
        Shock playbooks
      </p>
      <p className="mt-2 font-display text-[1.35rem] leading-tight text-ink">
        Write it down before 2am
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        Let&apos;s write down what you&apos;d actually do — so future-you
        doesn&apos;t have to work it out alone.
        {savedCount > 0 ? (
          <>
            {" "}
            <span className="text-sage-deep">
              {savedCount} plan{savedCount === 1 ? "" : "s"} ready.
            </span>
          </>
        ) : null}
      </p>

      <div className="mt-5 space-y-2">
        {CONTINGENCY_SCENARIOS.map((scenario) => {
          const isOpen = expanded === scenario.id;
          const saved = savedByScenario.get(scenario.id);
          const levers = drafts[scenario.id];
          const { months, indefinite } = runwayFor(levers);
          const summary = buildContingencyPlanSummary({
            scenario: scenario.id,
            levers,
            runwayMonths: months,
            runwayIndefinite: indefinite,
          });

          return (
            <div
              key={scenario.id}
              className="overflow-hidden rounded-[18px] border border-hairline bg-paper-2"
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : scenario.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                aria-expanded={isOpen}
              >
                <span>
                  <span className="font-medium text-ink">{scenario.title}</span>
                  {saved ? (
                    <span className="ml-2 text-xs text-sage-deep">Saved</span>
                  ) : null}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>

              {isOpen ? (
                <div className="border-t border-hairline-soft px-4 pb-5 pt-2">
                  <p className="text-sm text-ink-soft">{scenario.prompt}</p>
                  <p className="mt-2 text-sm text-ink-soft">
                    With these levers:{" "}
                    <span className="font-semibold tabular-nums text-ink">
                      {formatRunwayHeadline(months, indefinite).toLowerCase()}
                    </span>
                  </p>

                  <PlaybookLevers
                    accessibleAssets={accessibleAssets}
                    totalAssets={totalAssets}
                    swr={swr}
                    fullMonthlySpend={fullMonthlySpend}
                    essentialMonthlySpend={essentialMonthlySpend}
                    partTimeIncomeAnnual={partTimeIncomeAnnual}
                    levers={levers}
                    onLeversChange={(next) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [scenario.id]: next,
                      }))
                    }
                  />

                  <div className="mt-4">
                    <label
                      htmlFor={`plan-notes-${scenario.id}`}
                      className="text-xs font-medium text-ink-soft"
                    >
                      Your plan in your words
                    </label>
                    <textarea
                      id={`plan-notes-${scenario.id}`}
                      value={levers.notes ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [scenario.id]: {
                            ...prev[scenario.id],
                            notes: e.target.value,
                          },
                        }))
                      }
                      placeholder={summary}
                      rows={3}
                      className="mt-2 w-full resize-y rounded-[14px] border border-hairline bg-paper px-3 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-soft"
                    />
                    <p className="mt-2 text-sm text-ink-soft">
                      <span className="font-medium text-ink">Draft:</span>{" "}
                      {summary}
                    </p>
                  </div>

                  {saved ? (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-sage-deep">
                      <Check
                        className="h-3.5 w-3.5"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      Saved {formatCoverageDate(saved.savedAt)} — that&apos;s one
                      less thing to carry.
                    </p>
                  ) : null}

                  <button
                    type="button"
                    disabled={saving === scenario.id}
                    onClick={() => void savePlan(scenario.id)}
                    className={`mt-4 ${saved ? QUIET_BUTTON : PRIMARY_BUTTON} disabled:opacity-40`}
                  >
                    {saving === scenario.id
                      ? "Saving…"
                      : saved
                        ? "Update plan"
                        : "Save this plan"}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {error ? <p className="mt-4 text-sm text-amber">{error}</p> : null}
    </section>
  );
}

function PlaybookLevers({
  accessibleAssets,
  totalAssets,
  swr,
  fullMonthlySpend,
  essentialMonthlySpend,
  partTimeIncomeAnnual,
  levers,
  onLeversChange,
}: {
  accessibleAssets: number;
  totalAssets: number;
  swr: number;
  fullMonthlySpend: number;
  essentialMonthlySpend: number;
  partTimeIncomeAnnual: number;
  levers: ContingencyLevers;
  onLeversChange: (levers: ContingencyLevers) => void;
}) {
  return (
    <RunwayMeter
      embedded
      compact
      leversOnly
      accessibleAssets={accessibleAssets}
      totalAssets={totalAssets}
      swr={swr}
      fullMonthlySpend={fullMonthlySpend}
      essentialMonthlySpend={essentialMonthlySpend}
      partTimeIncomeAnnual={partTimeIncomeAnnual}
      levers={levers}
      onLeversChange={(next) =>
        onLeversChange({ ...levers, ...next, notes: levers.notes })
      }
    />
  );
}
