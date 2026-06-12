"use client";

import { DemoBanner } from "@/components/portfolio/DemoBanner";
import { SunriseHero } from "@/components/illustrations/SunriseHero";
import { MountainMilestone } from "@/components/illustrations/MountainMilestone";
import { EmptyAccounts } from "@/components/illustrations/EmptyStates";
import { FLOATING_CARD } from "@/components/ui/cardStyles";
import type { AccountsApiResponse } from "@/lib/account-groups";
import type { BudgetSummary } from "@/lib/budget-types";
import { getChangeHorizonLabel } from "@/lib/chart-data";
import { formatCurrency, formatPercent, formatSignedCurrency } from "@/lib/format";
import {
  computeFourPercentMonthly,
  formatBudgetMonthLabel,
  getEncouragement,
  getJourneyWins,
  getNextMilestone,
} from "@/lib/home-journey";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  PieChart,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type HomeViewProps = {
  isDemo?: boolean;
};

// Flat pastel chips: soft tinted background + saturated icon (no gradients).
const ICON_ACCENTS = {
  gold: "bg-accent-gold-soft text-accent-gold",
  green: "bg-accent-green-soft text-accent-green",
  purple: "bg-accent-purple-soft text-accent-purple",
  blue: "bg-accent-blue-soft text-accent-blue",
} as const;

type IconAccent = keyof typeof ICON_ACCENTS;

function HomeSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col animate-pulse">
      <section className="shrink-0 bg-gradient-to-b from-(--hero-from) via-(--hero-via) to-(--hero-to) px-4 pb-16 pt-8">
        <div className="mx-auto h-3 w-24 rounded-full bg-ink/5" />
        <div className="mx-auto mt-5 h-14 w-56 rounded-xl bg-ink/5" />
        <div className="mx-auto mt-2 h-3 w-28 rounded-full bg-ink/5" />
      </section>
      <div className="-mt-10 space-y-4 px-4 pb-6">
        <div className="h-32 rounded-3xl bg-surface-raised shadow-card" />
        <div className="h-24 rounded-3xl bg-surface-raised shadow-soft" />
      </div>
    </div>
  );
}

function GradientIcon({
  icon: Icon,
  gradient,
  size = "md",
}: {
  icon: LucideIcon;
  gradient: IconAccent;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const iconDim = size === "lg" ? "h-7 w-7" : "h-5 w-5";
  return (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center rounded-2xl ${ICON_ACCENTS[gradient]}`}
    >
      <Icon className={iconDim} strokeWidth={2} aria-hidden />
    </span>
  );
}

function HomeHero({
  netWorth,
  changeAmount,
  changePercent,
  encouragement,
  nextMilestone,
  hasAccounts,
}: {
  netWorth: number;
  changeAmount: number;
  changePercent: number;
  encouragement: { headline: string; subline: string };
  nextMilestone: ReturnType<typeof getNextMilestone>;
  hasAccounts: boolean;
}) {
  const isPositive = changePercent >= 0;

  return (
    <section
      className="relative shrink-0 overflow-hidden bg-gradient-to-b from-(--hero-from) via-(--hero-via) to-(--hero-to) pb-20 pt-8 text-ink"
      aria-label="Net worth and journey progress"
    >
      <SunriseHero className="pointer-events-none absolute inset-0 h-full w-full opacity-60" />
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl lg:h-72 lg:w-72"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-10 top-32 h-40 w-40 rounded-full bg-accent-gold/10 blur-3xl lg:h-56 lg:w-56"
        aria-hidden
      />

      <div className="relative lg:mx-auto lg:w-full lg:max-w-5xl">
      <div className="relative px-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {hasAccounts ? "Your path" : "Net worth"}
        </p>

        <p className="mt-3 text-[clamp(2.75rem,14vw,3.5rem)] font-bold leading-none tracking-tight tabular-nums text-ink">
          {formatCurrency(netWorth)}
        </p>

        {hasAccounts ? (
          <p className="mt-2 text-xs font-medium tabular-nums text-ink-muted">
            <span className={isPositive ? "text-gain" : "text-loss"}>
              {formatSignedCurrency(changeAmount)}
              {Number.isFinite(changePercent) ? (
                <> ({formatPercent(changePercent)})</>
              ) : null}
            </span>
            <span className="text-ink-muted">
              {" "}
              · {getChangeHorizonLabel("YTD")}
            </span>
          </p>
        ) : null}

        <p className="mt-5 text-base font-semibold text-ink">
          {encouragement.headline}
        </p>
        <p className="mx-auto mt-1.5 max-w-[18rem] text-sm leading-relaxed text-ink-secondary">
          {encouragement.subline}
        </p>
      </div>

      {nextMilestone && hasAccounts ? (
        <div className="relative mx-4 mt-6 overflow-hidden rounded-2xl bg-surface/70 p-4 shadow-card ring-1 ring-hairline backdrop-blur-sm lg:mx-auto lg:max-w-xl">
          <MountainMilestone className="pointer-events-none absolute -right-2 -top-1 h-20 w-24 text-accent-purple opacity-40" />
          <div className="relative flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Next milestone
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-ink">
                {nextMilestone.label}
              </p>
            </div>
            <p className="text-right text-[11px] tabular-nums text-ink-muted">
              <span className="block text-sm font-semibold text-primary">
                {formatCurrency(nextMilestone.remaining)}
              </span>
              to go
            </p>
          </div>
          <div
            className="relative mt-3 h-3 overflow-hidden rounded-full bg-canvas-sunken"
            role="progressbar"
            aria-valuenow={Math.round(nextMilestone.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress toward ${nextMilestone.label}`}
          >
            <div
              className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
              style={{ width: `${nextMilestone.progress * 100}%` }}
            />
          </div>
        </div>
      ) : null}
      </div>
    </section>
  );
}

function FloatingCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`${FLOATING_CARD} p-5 ${className}`}>
      {children}
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon: Icon,
  gradient,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: IconAccent;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[4.5rem] items-center gap-4 rounded-3xl bg-surface-raised p-4 shadow-card ring-1 ring-hairline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      <GradientIcon icon={Icon} gradient={gradient} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">
          {title}
        </span>
        <span className="block text-xs text-ink-muted">
          {description}
        </span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
        strokeWidth={2}
        aria-hidden
      />
    </Link>
  );
}

const WIN_ICONS: Record<string, LucideIcon> = {
  "savings-rate": TrendingUp,
  "green-month": CalendarDays,
  "four-percent": Sparkles,
};

function WinChip({
  label,
  detail,
  id,
}: {
  label: string;
  detail: string;
  id: string;
}) {
  const Icon = WIN_ICONS[id] ?? Trophy;
  return (
    <li className="flex min-w-[9.5rem] shrink-0 flex-col gap-2 rounded-2xl bg-gain-soft p-3.5 shadow-soft ring-1 ring-hairline">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gain text-on-primary">
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
      <span className="text-sm font-semibold leading-tight text-ink">
        {label}
      </span>
      <span className="text-[11px] leading-snug text-ink-secondary">
        {detail}
      </span>
    </li>
  );
}

export function HomeView({ isDemo = false }: HomeViewProps) {
  const [accounts, setAccounts] = useState<AccountsApiResponse | null>(null);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [accountsRes, budgetRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/budget/summary"),
      ]);

      if (!accountsRes.ok) {
        const body = (await accountsRes.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load accounts");
      }

      const accountsData = (await accountsRes.json()) as AccountsApiResponse;
      setAccounts(accountsData);

      if (budgetRes.ok) {
        setBudget((await budgetRes.json()) as BudgetSummary);
      } else {
        setBudget(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load home");
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isDemo ? <DemoBanner /> : null}

      <HomeHero
        netWorth={netWorth}
        changeAmount={changeAmount}
        changePercent={changePercent}
        encouragement={encouragement}
        nextMilestone={nextMilestone}
        hasAccounts={hasAccounts}
      />

      <div className="relative z-10 -mt-12 flex min-h-0 flex-1 flex-col overflow-y-auto bg-canvas">
        <div className="space-y-5 px-4 pb-8 pt-2 lg:mx-auto lg:grid lg:w-full lg:max-w-5xl lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0 lg:px-6">
          {error ? (
            <FloatingCard className="lg:col-span-2">
              <p className="text-sm text-loss">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void load();
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-loss-soft px-3 py-2 text-sm font-medium text-loss transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loss"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden />
                Try again
              </button>
            </FloatingCard>
          ) : null}

          {!hasAccounts ? (
            <FloatingCard className="text-center lg:col-span-2">
              <EmptyAccounts className="mx-auto h-28 w-32" />
              <p className="mt-4 text-lg font-semibold text-ink">
                Ready when you are
              </p>
              <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-secondary">
                Link your first account on Portfolio to start tracking progress
                toward freedom.
              </p>
              <Link
                href="/portfolio"
                className="mt-5 inline-flex h-12 min-w-[11rem] items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-on-primary shadow-soft transition-[transform,box-shadow] hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Go to Portfolio
              </Link>
            </FloatingCard>
          ) : null}

          {showBudgetSetup ? (
            <FloatingCard className="lg:col-span-2">
              <div className="flex items-start gap-3">
                <GradientIcon icon={LayoutGrid} gradient="green" />
                <div>
                  <p className="font-semibold text-ink">
                    Set up your budget
                  </p>
                  <p className="mt-1 text-sm text-ink-secondary">
                    Add bucket targets to see monthly progress and savings rate
                    here.
                  </p>
                  <Link
                    href="/budget"
                    className="mt-3 inline-flex text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
                  >
                    Open Budget →
                  </Link>
                </div>
              </div>
            </FloatingCard>
          ) : null}

          {hasBudgetPulse ? (
            <Link
              href="/budget"
              className="block rounded-3xl bg-surface-raised p-5 shadow-card ring-1 ring-hairline transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:order-1 lg:self-stretch"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                {budget?.month
                  ? formatBudgetMonthLabel(budget.month)
                  : "This month"}
              </p>
              <div
                className={`mt-4 grid gap-4 ${
                  leftToSpend != null &&
                  budget.totalTarget > 0 &&
                  savingsRate != null
                    ? "grid-cols-2"
                    : "grid-cols-1"
                }`}
              >
                {leftToSpend != null && budget.totalTarget > 0 ? (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                      Left to spend
                    </p>
                    <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-ink">
                      {formatCurrency(Math.max(0, leftToSpend))}
                    </p>
                  </div>
                ) : null}
                {savingsRate != null ? (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                      Savings rate
                    </p>
                    <p
                      className={`mt-1 text-3xl font-bold tabular-nums tracking-tight ${
                        savingsRate >= 0 ? "text-gain" : "text-loss"
                      }`}
                    >
                      {savingsRate.toFixed(0)}%
                    </p>
                  </div>
                ) : null}
              </div>
            </Link>
          ) : null}

          {wins.length > 0 ? (
            <div className="lg:order-3 lg:col-span-2">
              <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                Wins along the way
              </p>
              <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:overflow-visible">
                {wins.map((win) => (
                  <WinChip
                    key={win.id}
                    id={win.id}
                    label={win.label}
                    detail={win.detail}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {showFourPercentCard ? (
            <div className="relative overflow-hidden rounded-3xl bg-primary p-5 text-on-primary shadow-card lg:order-2 lg:self-stretch">
              <MountainMilestone className="pointer-events-none absolute -bottom-2 -right-2 h-24 w-28 text-on-primary opacity-25" />
              <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-on-primary/80">
                The 4% rule
              </p>
              <p className="relative mt-3 text-4xl font-bold tabular-nums tracking-tight">
                {formatCurrency(fourPercentMonthly)}
              </p>
              <p className="relative text-xs font-medium text-on-primary/90">per month</p>
              <p className="relative mt-3 max-w-[20rem] text-sm leading-relaxed text-on-primary/90">
                Your portfolio could sustainably cover this much spending. Real
                progress, even if full independence is still ahead.
              </p>
            </div>
          ) : null}

          {hasAccounts ? (
            <nav
              className="space-y-3 pt-1 lg:order-4 lg:col-span-2 lg:grid lg:grid-cols-3 lg:gap-3 lg:space-y-0"
              aria-label="Quick links"
            >
              {reviewCount > 0 ? (
                <ActionCard
                  href="/budget"
                  title={`Review ${reviewCount} transaction${reviewCount === 1 ? "" : "s"}`}
                  description="Clear the queue so your budget stays accurate"
                  icon={ClipboardList}
                  gradient="gold"
                />
              ) : null}
              <ActionCard
                href="/budget"
                title="Budget"
                description="Buckets, spending, and what's left"
                icon={LayoutGrid}
                gradient="green"
              />
              <ActionCard
                href="/portfolio"
                title="Portfolio"
                description="Accounts and how your assets are growing"
                icon={PieChart}
                gradient="purple"
              />
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
