"use client";

import { AddAccountButton } from "@/components/portfolio/AddAccountButton";
import { GrowthRing } from "@/components/illustrations/GrowthRing";
import { SproutVessel } from "@/components/illustrations/SproutVessel";
import { LifePlanPricingSection } from "@/components/life-plan/LifePlanPricingSection";
import { GHOST_BUTTON, PRIMARY_BUTTON, QUIET_BUTTON } from "@/components/ui/cardStyles";
import { BORROW_A_LIFE_TEMPLATE, DEFAULT_LIFE_EXPENSE_CATEGORIES } from "@/lib/life-plan-defaults";
import {
  computeAnnualLifeCost,
  computeTarget,
  DEFAULT_INFLATION_RATE,
  DEFAULT_SWR,
  type LifeExpenseCategoryInput,
} from "@/lib/life-plan";
import type { LifePlanSnapshot } from "@/lib/life-plan-types";
import { formatCurrency } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const LIFE_CHIPS = [
  "More time with family",
  "Travel",
  "Creative work",
  "Less commuting",
  "A calmer week",
] as const;

const STEPS = [
  "welcome",
  "name",
  "shape",
  "price",
  "reveal",
  "connect",
  "firstLook",
] as const;

type StepId = (typeof STEPS)[number];

const EYEBROW = "text-[11.5px] font-bold uppercase tracking-[0.16em]";

function StepProgress({ step }: { step: StepId }) {
  const index = STEPS.indexOf(step);
  if (index <= 0) return null;
  return (
    <p className={`${EYEBROW} text-ink-faint`}>
      Step {index} of {STEPS.length - 1}
    </p>
  );
}

function StepShell({
  step,
  onBack,
  children,
}: {
  step: StepId;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-10 pt-6 lg:max-w-xl lg:px-8 lg:pt-10">
      <div className="mb-8 flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-full p-2 text-ink-soft hover:bg-sage-wash"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <div className="flex-1 text-center">
          <StepProgress step={step} />
        </div>
        <div className="w-9" />
      </div>
      {children}
    </div>
  );
}

export function NameTheLifeFlow() {
  const [step, setStep] = useState<StepId>("welcome");
  const [label, setLabel] = useState("");
  const [phases, setPhases] = useState<{ label: string }[]>([]);
  const [phaseInput, setPhaseInput] = useState("");
  const [categories, setCategories] = useState<LifeExpenseCategoryInput[]>(
    () => [...DEFAULT_LIFE_EXPENSE_CATEGORIES],
  );
  const [snapshot, setSnapshot] = useState<LifePlanSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [householdSize, setHouseholdSize] = useState(1);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateNote, setEstimateNote] = useState<string | null>(null);
  const [targetYear, setTargetYear] = useState<number | null>(
    () => new Date().getFullYear() + 20,
  );

  const loadInitial = useCallback(async () => {
    setError(null);
    try {
      const [planRes, accountsRes] = await Promise.all([
        fetch("/api/life-plan"),
        fetch("/api/accounts"),
      ]);

      if (planRes.ok) {
        const body = (await planRes.json()) as { snapshot: LifePlanSnapshot | null };
        if (body.snapshot) {
          setSnapshot(body.snapshot);
          setStep("firstLook");
          setLoading(false);
          return;
        }
      }

      if (accountsRes.ok) {
        const accounts = (await accountsRes.json()) as { groups: unknown[] };
        setHasAccounts((accounts.groups?.length ?? 0) > 0);
      }
    } catch {
      setError("We couldn't load your starting point — try once more.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const savePlan = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/life-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || "My life",
          zipCode: zipCode || null,
          householdSize,
          categories: categories.map((c, index) => ({
            label: c.label,
            annualAmount: c.annualAmount,
            isEssential: c.isEssential,
            sortOrder: index,
            budgetCategoryId: c.budgetCategoryId ?? null,
          })),
          phases: phases.map((p, index) => ({
            label: p.label,
            sortOrder: index,
          })),
          tierAssumptions: {
            targetYear,
          },
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to save your life plan");
      }
      const body = (await res.json()) as { snapshot: LifePlanSnapshot };
      setSnapshot(body.snapshot);
      setStep("reveal");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const refreshSnapshot = async () => {
    const res = await fetch("/api/life-plan");
    if (!res.ok) return;
    const body = (await res.json()) as { snapshot: LifePlanSnapshot | null };
    if (body.snapshot) setSnapshot(body.snapshot);
  };

  const refreshAccounts = async () => {
    const res = await fetch("/api/accounts");
    if (!res.ok) return;
    const body = (await res.json()) as { groups: unknown[] };
    setHasAccounts((body.groups?.length ?? 0) > 0);
    await refreshSnapshot();
  };

  const annualCost = computeAnnualLifeCost(categories);
  const previewTarget = computeTarget(annualCost, 0.04);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-16">
        <SproutVessel stage={0} className="h-14 w-14 animate-pulse" />
        <p className="mt-4 text-sm text-ink-soft">Getting things ready…</p>
      </div>
    );
  }

  if (step === "welcome") {
    return (
      <StepShell step="welcome">
        <div className="flex flex-1 flex-col items-center text-center">
          <SproutVessel stage={0} className="h-16 w-16" />
          <h1 className="mt-8 font-display text-[clamp(2rem,6vw,2.5rem)] leading-[1.05] tracking-[-0.015em] text-ink">
            Before any numbers — what&apos;s the life you&apos;re building toward?
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-soft">
            Ember starts with the life, not your income. You&apos;ll name it, price
            it roughly, and see what it means for your freedom — in plain words.
          </p>
          <button
            type="button"
            onClick={() => setStep("name")}
            className={`mt-10 ${PRIMARY_BUTTON}`}
          >
            Begin
          </button>
        </div>
      </StepShell>
    );
  }

  if (step === "name") {
    return (
      <StepShell step="name" onBack={() => setStep("welcome")}>
        <h1 className="font-display text-[1.75rem] leading-tight text-ink">
          What does a life that&apos;s <em>yours</em> look like?
        </h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          A sentence is enough. Rough is fine — we&apos;ll sharpen it together.
        </p>
        <textarea
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          rows={4}
          placeholder="More mornings slow enough to notice the light…"
          className="mt-6 w-full resize-none rounded-[18px] border border-hairline bg-paper-2 px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
        />
        <p className={`${EYEBROW} mt-6 text-ink-faint`}>Or start from a seed</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {LIFE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() =>
                setLabel((prev) => (prev ? `${prev} ${chip.toLowerCase()}.` : chip))
              }
              className="rounded-full bg-sage-wash px-3 py-1.5 text-sm font-medium text-sage-deep transition-colors hover:opacity-90"
            >
              {chip}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setLabel(BORROW_A_LIFE_TEMPLATE.label);
            setCategories([...BORROW_A_LIFE_TEMPLATE.categories]);
          }}
          className={`mt-4 w-full text-center ${GHOST_BUTTON}`}
        >
          Borrow a starting life to edit
        </button>
        {error ? <p className="mt-4 text-sm text-amber">{error}</p> : null}
        <button
          type="button"
          disabled={!label.trim()}
          onClick={() => setStep("shape")}
          className={`mt-8 w-full ${PRIMARY_BUTTON} disabled:opacity-40`}
        >
          Continue
        </button>
      </StepShell>
    );
  }

  if (step === "shape") {
    return (
      <StepShell step="shape" onBack={() => setStep("name")}>
        <h1 className="font-display text-[1.75rem] leading-tight text-ink">
          Now → and someday
        </h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          Optional. A sabbatical, part-time, fully optional work — captured for
          later, not used in today&apos;s target.
        </p>
        <div className="mt-6 flex gap-2">
          <input
            type="text"
            value={phaseInput}
            onChange={(e) => setPhaseInput(e.target.value)}
            placeholder="e.g. A year abroad first"
            className="min-w-0 flex-1 rounded-[18px] border border-hairline bg-paper-2 px-4 py-3 text-[15px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
          />
          <button
            type="button"
            disabled={!phaseInput.trim()}
            onClick={() => {
              setPhases((prev) => [...prev, { label: phaseInput.trim() }]);
              setPhaseInput("");
            }}
            className={`shrink-0 ${GHOST_BUTTON} disabled:opacity-40`}
          >
            Add
          </button>
        </div>
        {phases.length > 0 ? (
          <ul className="mt-4 divide-y divide-line-soft border-t border-hairline">
            {phases.map((phase, i) => (
              <li
                key={`${phase.label}-${i}`}
                className="flex items-center justify-between py-3 text-[15px] text-ink"
              >
                {phase.label}
                <button
                  type="button"
                  onClick={() =>
                    setPhases((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="text-xs text-ink-faint underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto flex flex-col gap-3 pt-10">
          <button
            type="button"
            onClick={() => setStep("price")}
            className={PRIMARY_BUTTON}
          >
            Continue
          </button>
          <button
            type="button"
            onClick={() => setStep("price")}
            className={`text-center ${QUIET_BUTTON}`}
          >
            Skip for now
          </button>
        </div>
      </StepShell>
    );
  }

  if (step === "price") {
    const applyLocalEstimate = async () => {
      setEstimateLoading(true);
      setEstimateNote(null);
      setError(null);
      try {
        const qs = new URLSearchParams({
          zip: zipCode,
          householdSize: String(householdSize),
        });
        const res = await fetch(`/api/life-plan/estimate?${qs}`);
        const body = (await res.json()) as {
          estimate?: {
            categories: LifeExpenseCategoryInput[];
            notes: { col: string; healthcare: string };
          };
          error?: string;
        };
        if (!res.ok || !body.estimate) {
          throw new Error(body.error ?? "Estimate failed");
        }
        setCategories(body.estimate.categories);
        setEstimateNote(
          `${body.estimate.notes.col} ${body.estimate.notes.healthcare}`,
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Estimate failed");
      } finally {
        setEstimateLoading(false);
      }
    };

    return (
      <StepShell step="price" onBack={() => setStep("shape")}>
        <h1 className="font-display text-[1.75rem] leading-tight text-ink">
          Price the life
        </h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          Start from your real budget if you have one — then tune. Tag
          what&apos;s essential; that powers runway later.
        </p>
        <div className="mt-4">
          <LifePlanPricingSection
            embedded
            categories={categories}
            onCategoriesChange={setCategories}
            swr={DEFAULT_SWR}
            inflationRate={DEFAULT_INFLATION_RATE}
            targetYear={targetYear}
            onTargetYearChange={setTargetYear}
            zipCode={zipCode}
            householdSize={householdSize}
            onZipCodeChange={setZipCode}
            onHouseholdSizeChange={setHouseholdSize}
            onApplyLocalEstimate={applyLocalEstimate}
            estimateLoading={estimateLoading}
            estimateNote={estimateNote}
          />
        </div>
        {error ? <p className="mt-3 text-sm text-amber">{error}</p> : null}
        <button
          type="button"
          disabled={saving || annualCost <= 0}
          onClick={() => void savePlan()}
          className={`mt-6 w-full ${PRIMARY_BUTTON} disabled:opacity-40`}
        >
          {saving ? "Saving…" : "See what this means"}
        </button>
      </StepShell>
    );
  }

  if (step === "reveal") {
    const derived = snapshot?.derived;
    const L = derived?.annualLifeCost ?? annualCost;
    const T = derived?.target ?? previewTarget;

    return (
      <StepShell step="reveal" onBack={() => setStep("price")}>
        <div className="flex flex-col items-center text-center">
          <SproutVessel stage={0} className="h-20 w-20" />
          <p className={`${EYEBROW} mt-8 text-terra`}>Your starting estimate</p>
          <p className="mt-4 font-display text-[1.35rem] leading-snug text-ink">
            A life like this runs about{" "}
            <span className="tabular-nums">{formatCurrency(L)}</span> a year.
          </p>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-soft">
            To hold it for good, you&apos;re growing toward roughly{" "}
            <span className="font-semibold tabular-nums text-ink">
              {formatCurrency(T)}
            </span>
            — a starting estimate, not a promise. We&apos;ll keep it honest as things
            change.
          </p>
          <button
            type="button"
            onClick={() => setStep("connect")}
            className={`mt-10 ${PRIMARY_BUTTON}`}
          >
            Ground it in today
          </button>
        </div>
      </StepShell>
    );
  }

  if (step === "connect") {
    return (
      <StepShell step="connect" onBack={() => setStep("reveal")}>
        <h1 className="font-display text-[1.75rem] leading-tight text-ink">
          Where you stand today
        </h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          Link accounts through Plaid, or add what you have by hand — both paths
          work equally well here.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 border-t border-hairline pt-8">
          <AddAccountButton onLinked={refreshAccounts} />
          {hasAccounts ? (
            <p className="text-sm text-sage">
              Accounts connected — you&apos;re ready for your first look.
            </p>
          ) : (
            <p className="text-sm text-ink-soft">
              No accounts yet? Manual entry counts — add what you have.
            </p>
          )}
        </div>
        <div className="mt-auto flex flex-col gap-3 pt-10">
          <button
            type="button"
            onClick={async () => {
              await refreshSnapshot();
              setStep("firstLook");
            }}
            className={PRIMARY_BUTTON}
          >
            {hasAccounts ? "See my first look" : "Continue without linking"}
          </button>
          <Link href="/portfolio" className={`text-center ${GHOST_BUTTON}`}>
            Open Portfolio to add accounts
          </Link>
        </div>
      </StepShell>
    );
  }

  // firstLook
  const derived = snapshot?.derived;
  const progressPct = Math.round((derived?.progressPct ?? 0) * 100);
  const baselineRunway = derived?.runway.find((r) => r.scenario === "baseline");
  const runwayMonths = baselineRunway?.indefinite
    ? null
    : baselineRunway?.months ?? 0;
  const securedCount = derived?.securedCategoryCount ?? 0;
  const nextCoverage = derived?.nextCoverageLabel;
  const assets = snapshot?.assets.totalInvestedLiquid ?? 0;

  return (
    <StepShell step="firstLook">
      <div className="flex flex-col items-center text-center">
        <GrowthRing pct={progressPct} size={148}>
          <span className="font-display text-[1.75rem] tabular-nums text-ink">
            {progressPct}%
          </span>
        </GrowthRing>
        <p className={`${EYEBROW} mt-6 text-sage`}>Freedom progress</p>
        <p className="mt-2 font-display text-[1.5rem] leading-tight text-ink">
          You&apos;ve named it and you&apos;ve started.
        </p>

        <div className="mt-8 w-full border-t border-hairline pt-6 text-left">
          <p className="text-[13px] text-ink-soft">Runway</p>
          <p className="mt-1 text-[1.35rem] font-semibold tabular-nums text-ink">
            {assets <= 0 ? (
              "The floor you're building from"
            ) : baselineRunway?.indefinite ? (
              "Essentials covered — breathing room is open-ended"
            ) : (
              <>
                Right now, you could float for{" "}
                <span className="text-sage">
                  {Math.max(0, Math.floor(runwayMonths ?? 0))} months
                </span>
              </>
            )}
          </p>
          {assets > 0 && !baselineRunway?.indefinite ? (
            <p className="mt-1 text-sm text-ink-soft">
              That&apos;s a real floor — and it grows from here.
            </p>
          ) : null}
        </div>

        <div className="mt-6 w-full border-t border-hairline pt-6 text-left">
          <p className="text-[13px] text-ink-soft">Coverage</p>
          {securedCount > 0 ? (
            <p className="mt-1 text-[15px] text-ink">
              {derived?.categoryCoverage
                .filter((c) => c.secured)
                .map((c) => `${c.label} — secured`)
                .join(". ")}
              .
            </p>
          ) : nextCoverage ? (
            <p className="mt-1 text-[15px] text-ink-soft">
              You&apos;re closer than you think —{" "}
              <span className="font-medium text-ink">{nextCoverage}</span> is next
              in view.
            </p>
          ) : (
            <p className="mt-1 text-[15px] text-ink-soft">
              Your coverage map will grow as your garden does.
            </p>
          )}
        </div>

        <Link href="/" className={`mt-10 w-full text-center ${PRIMARY_BUTTON}`}>
          Come back tomorrow and tend it
        </Link>
        <Link href="/life-plan/edit" className={`mt-3 w-full text-center ${GHOST_BUTTON}`}>
          Edit life plan
        </Link>
        <Link href="/planner" className={`mt-3 w-full text-center ${QUIET_BUTTON}`}>
          Open Planner
        </Link>
      </div>
    </StepShell>
  );
}
