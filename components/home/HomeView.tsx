"use client";

import { DemoBanner } from "@/components/portfolio/DemoBanner";
import { SunriseHero } from "@/components/illustrations/SunriseHero";
import { SproutVessel, stageForPct } from "@/components/illustrations/SproutVessel";
import { Sprig } from "@/components/illustrations/Sprig";
import { EmptyAccounts, EmptyBudget } from "@/components/illustrations/EmptyStates";
import { PRIMARY_BUTTON } from "@/components/ui/cardStyles";
import type { AccountsApiResponse } from "@/lib/account-groups";
import type { BudgetSummary } from "@/lib/budget-types";
import { getChangeHorizonLabel } from "@/lib/chart-data";
import { formatCurrency, formatPercent, formatSignedCurrency } from "@/lib/format";
import { CoverageTeaser } from "@/components/planner/CoverageTeaser";
import type { LifePlanSnapshot } from "@/lib/life-plan-types";
import {
  computeFourPercentMonthly,
  formatBudgetMonthLabel,
  getEncouragement,
  getJourneyWins,
  getNextMilestone,
} from "@/lib/home-journey";
import {
  ArrowRight,
  ClipboardList,
  Compass,
  LayoutGrid,
  PieChart,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GrowthRing } from "@/components/illustrations/GrowthRing";

type HomeViewProps = {
  isDemo?: boolean;
};

const EYEBROW = "text-[11.5px] font-bold uppercase tracking-[0.16em]";

function HomeSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col animate-pulse">
      <section className="shrink-0 bg-gradient-to-b from-(--hero-from) via-(--hero-via) to-(--hero-to) px-4 pb-16 pt-10">
        <div className="mx-auto h-3 w-24 rounded-full bg-ink/5" />
        <div className="mx-auto mt-5 h-14 w-56 rounded-xl bg-ink/5" />
        <div className="mx-auto mt-3 h-3 w-40 rounded-full bg-ink/5" />
      </section>
      <div className="mt-8 space-y-8 px-5">
        <div className="h-12 w-full rounded-xl bg-ink/5" />
        <div className="h-28 w-full rounded-[22px] bg-ink/5" />
      </div>
    </div>
  );
}

function HomeHero({
  netWorth,
  changeAmount,
  changePercent,
  encouragement,
  hasAccounts,
}: {
  netWorth: number;
  changeAmount: number;
  changePercent: number;
  encouragement: { headline: string; subline: string };
  hasAccounts: boolean;
}) {
  const isPositive = changePercent >= 0;

  return (
    <section
      className="relative shrink-0 overflow-hidden bg-gradient-to-b from-(--hero-from) via-(--hero-via) to-(--hero-to) pb-14 pt-10 text-ink"
      aria-label="Net worth and reflection"
    >
      <SunriseHero className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />

      <div className="relative px-5 text-center lg:mx-auto lg:w-full lg:max-w-5xl">
        <p className={`${EYEBROW} text-terra`}>
          {hasAccounts ? "Your garden" : "Net worth"}
        </p>

        <p className="mt-3 text-[clamp(2.75rem,13vw,3.4rem)] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">
          {formatCurrency(netWorth)}
        </p>

        {hasAccounts ? (
          <p className="mt-2.5 text-[13px] font-medium tabular-nums text-ink-soft">
            <span className={isPositive ? "text-sage" : "text-ink-soft"}>
              {formatSignedCurrency(changeAmount)}
              {Number.isFinite(changePercent) ? (
                <> ({formatPercent(changePercent)})</>
              ) : null}
            </span>
            <span className="text-ink-faint"> · {getChangeHorizonLabel("YTD")}</span>
          </p>
        ) : null}

        <p className="mx-auto mt-6 max-w-[20rem] font-display text-[1.6rem] leading-[1.15] tracking-[-0.015em] text-ink">
          {encouragement.headline}
        </p>
        <p className="mx-auto mt-2 max-w-[22rem] text-[15px] leading-relaxed text-ink-soft">
          {encouragement.subline}
        </p>
      </div>
    </section>
  );
}

/** Flat section header: eyebrow + hairline rule, no box. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${EYEBROW} mb-4 text-ink-faint`}>{children}</p>
  );
}

function ActionRow({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 border-b border-line-soft py-4 transition-colors last:border-b-0 hover:bg-sage-wash/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-sage-wash text-sage-deep">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{title}</span>
        <span className="block text-[13px] text-ink-soft">{description}</span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-terra"
        strokeWidth={2}
        aria-hidden
      />
    </Link>
  );
}

function WinChip({ label, detail }: { label: string; detail: string }) {
  return (
    <li className="flex min-w-[10.5rem] shrink-0 flex-col gap-1.5 rounded-[18px] bg-sage-wash p-4">
      <SproutVessel stage={2} tile={false} className="h-6 w-6" />
      <span className="mt-1 text-[14px] font-semibold leading-tight text-sage-deep">
        {label}
      </span>
      <span className="text-[12px] leading-snug text-ink-soft">{detail}</span>
    </li>
  );
}

export function HomeView({ isDemo = false }: HomeViewProps) {
  const [accounts, setAccounts] = useState<AccountsApiResponse | null>(null);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [lifePlan, setLifePlan] = useState<LifePlanSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [accountsRes, budgetRes, lifePlanRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/budget/summary"),
        fetch("/api/life-plan"),
      ]);

      if (!accountsRes.ok) {
        const body = (await accountsRes.json()) as { error?: string };
        throw new Error(body.error ?? "We couldn't gather your accounts");
      }

      const accountsData = (await accountsRes.json()) as AccountsApiResponse;
      setAccounts(accountsData);

      if (budgetRes.ok) {
        setBudget((await budgetRes.json()) as BudgetSummary);
      } else {
        setBudget(null);
      }

      if (lifePlanRes.ok) {
        const body = (await lifePlanRes.json()) as {
          snapshot: LifePlanSnapshot | null;
        };
        setLifePlan(body.snapshot);
      } else {
        setLifePlan(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "We couldn't open your garden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <HomeSkeleton />;
  }

  const netWorth = accounts?.netWorth ?? 0;
  const changeAmount = accounts?.netWorthChangeAmount ?? 0;
  const changePercent = accounts?.netWorthChangePercent ?? 0;
  const hasAccounts = (accounts?.groups.length ?? 0) > 0;
  const encouragement = getEncouragement(netWorth, budget);
  const nextMilestone = getNextMilestone(netWorth);
  const wins = getJourneyWins(netWorth, budget);
  const fourPercentMonthly = computeFourPercentMonthly(netWorth);
  const showFourPercentCard = fourPercentMonthly >= 100;
  const reviewCount = budget?.unreviewedCount ?? 0;
  const leftToSpend = budget?.leftToSpend;
  const savingsRate = budget?.savingsRate;
  const hasBudgetPulse =
    budget != null && (budget.totalTarget > 0 || budget.income > 0);
  const showBudgetSetup =
    hasAccounts && budget != null && budget.totalTarget <= 0 && budget.income <= 0;
  const milestonePct = nextMilestone
    ? Math.round(nextMilestone.progress * 100)
    : 0;
  const freedomPct = lifePlan
    ? Math.round(lifePlan.derived.progressPct * 100)
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-paper">
      {isDemo ? <DemoBanner /> : null}

      <HomeHero
        netWorth={netWorth}
        changeAmount={changeAmount}
        changePercent={changePercent}
        encouragement={encouragement}
        hasAccounts={hasAccounts}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl space-y-12 px-5 pb-12 pt-10 lg:px-8">
          {error ? (
            <div>
              <p className="text-[15px] text-ink">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void load();
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-terra transition-colors hover:bg-sage-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden />
                Try once more
              </button>
            </div>
          ) : null}

          {!lifePlan ? (
            <section
              className="border-t border-hairline pt-8 text-center"
              aria-label="Start with your life"
            >
              <p className="font-display text-[1.5rem] leading-tight text-ink">
                Before any numbers — name the life
              </p>
              <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-soft">
                Describe the life you want, price it roughly, and see your freedom
                target appear as a byproduct — not a starting whistle.
              </p>
              <Link
                href="/name-the-life"
                className={`mt-6 inline-flex ${PRIMARY_BUTTON}`}
              >
                Name your life
              </Link>
            </section>
          ) : null}

          {!hasAccounts ? (
            <div className="text-center">
              <EmptyAccounts className="mx-auto h-28 w-32" />
              <p className="mt-5 font-display text-[1.6rem] leading-tight text-ink">
                Nothing to tend just yet
              </p>
              <p className="mx-auto mt-2 max-w-xs text-[15px] text-ink-soft">
                And that&apos;s a fine place to begin. Link your first account to
                watch your progress take root.
              </p>
              <Link href="/portfolio" className={`mt-6 inline-flex ${PRIMARY_BUTTON}`}>
                Plant the first seed
              </Link>
            </div>
          ) : null}

          {lifePlan && hasAccounts ? (
            <>
              <section aria-label="Freedom progress">
                <SectionLabel>Toward your life</SectionLabel>
                <div className="flex items-center gap-5">
                  <GrowthRing pct={freedomPct ?? 0} size={88}>
                    <span className="text-lg font-semibold tabular-nums text-ink">
                      {freedomPct}%
                    </span>
                  </GrowthRing>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[1.25rem] leading-tight text-ink">
                      {lifePlan.plan.label}
                    </p>
                    <p className="mt-1.5 text-[13px] tabular-nums text-ink-soft">
                      Growing toward {formatCurrency(lifePlan.derived.target)}
                    </p>
                  </div>
                </div>
              </section>
              <CoverageTeaser
                derived={lifePlan.derived}
                milestoneEvents={lifePlan.plan.milestoneEvents}
                swr={lifePlan.plan.swr}
                partTimeIncome={lifePlan.plan.tierAssumptions.partTimeIncome}
              />
            </>
          ) : null}

          {/* Net-worth milestone fallback when no life plan yet */}
          {!lifePlan && nextMilestone && hasAccounts ? (
            <section aria-label="Next milestone">
              <SectionLabel>Toward freedom</SectionLabel>
              <div className="flex items-center gap-4">
                <SproutVessel stage={stageForPct(milestonePct)} className="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-display text-[1.35rem] leading-tight text-ink">
                      {nextMilestone.label}
                    </p>
                    <p className="text-[15px] font-bold tabular-nums text-sage">
                      {milestonePct}%
                    </p>
                  </div>
                  <div
                    className="mt-2.5 h-2 overflow-hidden rounded-full bg-[var(--ds-track)]"
                    role="progressbar"
                    aria-valuenow={milestonePct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progress toward ${nextMilestone.label}`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sage to-sage-soft motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
                      style={{ width: `${Math.max(milestonePct, 2)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[13px] tabular-nums text-ink-soft">
                    {formatCurrency(nextMilestone.remaining)} still to grow
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {showBudgetSetup ? (
            <section className="flex items-start gap-4 border-t border-hairline pt-8">
              <EmptyBudget className="h-12 w-14 shrink-0" />
              <div>
                <p className="font-display text-[1.35rem] leading-tight text-ink">
                  Shape this month&apos;s plan
                </p>
                <p className="mt-1.5 text-[15px] text-ink-soft">
                  Set a few bucket targets and we&apos;ll show how this month is
                  growing.
                </p>
                <Link
                  href="/budget"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-terra transition-colors hover:text-terra-deep"
                >
                  Open Budget
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                </Link>
              </div>
            </section>
          ) : null}

          {/* The 4% rule — the signature deep-green reflection band */}
          {showFourPercentCard ? (
            <section
              className="ff-green p-7"
              aria-label="What your portfolio could provide"
            >
              <Sprig className="pointer-events-none absolute -bottom-3 -right-3 h-28 w-28" />
              <p className={`${EYEBROW} ff-eyebrow`}>The 4% rule</p>
              <p className="mt-4 text-[2.6rem] font-semibold leading-none tabular-nums tracking-[-0.02em]">
                {formatCurrency(fourPercentMonthly)}
                <span className="ml-2 align-baseline text-[15px] font-medium opacity-80">
                  / month
                </span>
              </p>
              <p className="mt-4 max-w-[24rem] font-display text-[1.05rem] italic leading-[1.42]">
                What your garden could quietly provide each month — real progress,
                even with the path still ahead.
              </p>
            </section>
          ) : null}

          {/* This month's pulse — flat, hairline-framed */}
          {hasBudgetPulse ? (
            <section className="border-t border-hairline pt-8" aria-label="This month">
              <div className="flex items-center justify-between">
                <SectionLabel>
                  {budget?.month
                    ? formatBudgetMonthLabel(budget.month)
                    : "This month"}
                </SectionLabel>
                <Link
                  href="/budget"
                  className="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-terra transition-colors hover:text-terra-deep"
                >
                  Open Budget
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {leftToSpend != null && budget.totalTarget > 0 ? (
                  <div>
                    <p className="text-[13px] text-ink-soft">Room left to spend</p>
                    <p className="mt-1 text-[2rem] font-semibold tabular-nums tracking-[-0.02em] text-ink">
                      {formatCurrency(Math.max(0, leftToSpend))}
                    </p>
                  </div>
                ) : null}
                {savingsRate != null ? (
                  <div>
                    <p className="text-[13px] text-ink-soft">Set aside to grow</p>
                    <p
                      className={`mt-1 text-[2rem] font-semibold tabular-nums tracking-[-0.02em] ${
                        savingsRate >= 0 ? "text-sage" : "text-ink-soft"
                      }`}
                    >
                      {savingsRate.toFixed(0)}%
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {wins.length > 0 ? (
            <section aria-label="Wins along the way">
              <SectionLabel>Growing along the way</SectionLabel>
              <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:overflow-visible">
                {wins.map((win) => (
                  <WinChip key={win.id} label={win.label} detail={win.detail} />
                ))}
              </ul>
            </section>
          ) : null}

          {hasAccounts ? (
            <nav
              className="border-t border-hairline pt-2"
              aria-label="Quick links"
            >
              {reviewCount > 0 ? (
                <ActionRow
                  href="/budget"
                  title={`${reviewCount} to look over`}
                  description="A slow look keeps your plan in step with life"
                  icon={ClipboardList}
                />
              ) : null}
              <ActionRow
                href="/budget"
                title="Budget"
                description="Buckets, spending, and what's left"
                icon={LayoutGrid}
              />
              <ActionRow
                href="/planner"
                title="Planner"
                description="Coverage map, lifestyles, and freedom milestones"
                icon={Compass}
              />
              <ActionRow
                href="/portfolio"
                title="Portfolio"
                description="Accounts and how your assets are growing"
                icon={PieChart}
              />
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
