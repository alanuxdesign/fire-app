"use client";

import { DemoBanner } from "@/components/portfolio/DemoBanner";
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

const ICON_GRADIENTS = {
  amber: "from-amber-400 to-orange-500 shadow-amber-500/30",
  teal: "from-teal-400 to-emerald-600 shadow-teal-500/25",
  violet: "from-violet-400 to-indigo-600 shadow-violet-500/25",
  rose: "from-rose-400 to-pink-500 shadow-rose-500/25",
} as const;

type IconGradient = keyof typeof ICON_GRADIENTS;

function HomeSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col animate-pulse">
      <section className="shrink-0 bg-gradient-to-b from-zinc-900 via-teal-950 to-zinc-950 px-4 pb-16 pt-8">
        <div className="mx-auto h-3 w-24 rounded-full bg-white/10" />
        <div className="mx-auto mt-5 h-14 w-56 rounded-xl bg-white/10" />
        <div className="mx-auto mt-2 h-3 w-28 rounded-full bg-white/10" />
      </section>
      <div className="-mt-10 space-y-4 px-4 pb-6">
        <div className="h-32 rounded-3xl bg-white/80 shadow-xl dark:bg-zinc-900/80" />
        <div className="h-24 rounded-3xl bg-white/80 shadow-lg dark:bg-zinc-900/80" />
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
  gradient: IconGradient;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const iconDim = size === "lg" ? "h-7 w-7" : "h-5 w-5";
  return (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${ICON_GRADIENTS[gradient]} text-white shadow-lg`}
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
      className="relative shrink-0 overflow-hidden bg-gradient-to-b from-zinc-900 via-[#0c1f1f] to-zinc-950 pb-20 pt-8 text-white"
      aria-label="Net worth and journey progress"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-teal-500/20 blur-3xl lg:h-72 lg:w-72"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-10 top-32 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl lg:h-56 lg:w-56"
        aria-hidden
      />

      <div className="lg:mx-auto lg:w-full lg:max-w-5xl">
      <div className="relative px-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300/80">
          {hasAccounts ? "Your path" : "Net worth"}
        </p>

        <p className="mt-3 text-[clamp(2.75rem,14vw,3.5rem)] font-bold leading-none tracking-tight tabular-nums text-white drop-shadow-sm">
          {formatCurrency(netWorth)}
        </p>

        {hasAccounts ? (
          <p className="mt-2 text-xs font-medium tabular-nums text-zinc-400">
            <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
              {formatSignedCurrency(changeAmount)}
              {Number.isFinite(changePercent) ? (
                <> ({formatPercent(changePercent)})</>
              ) : null}
            </span>
            <span className="text-zinc-600">
              {" "}
              · {getChangeHorizonLabel("YTD")}
            </span>
          </p>
        ) : null}

        <p className="mt-5 text-base font-semibold text-amber-100/95">
          {encouragement.headline}
        </p>
        <p className="mx-auto mt-1.5 max-w-[18rem] text-sm leading-relaxed text-zinc-400">
          {encouragement.subline}
        </p>
      </div>

      {nextMilestone && hasAccounts ? (
        <div className="relative mx-4 mt-6 rounded-2xl bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm lg:mx-auto lg:max-w-xl">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Next milestone
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-white">
                {nextMilestone.label}
              </p>
            </div>
            <p className="text-right text-[11px] tabular-nums text-zinc-500">
              <span className="block text-sm font-semibold text-teal-300">
                {formatCurrency(nextMilestone.remaining)}
              </span>
              to go
            </p>
          </div>
          <div
            className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-800/80 shadow-inner"
            role="progressbar"
            aria-valuenow={Math.round(nextMilestone.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress toward ${nextMilestone.label}`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)] motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
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
  gradient: IconGradient;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[4.5rem] items-center gap-4 rounded-3xl bg-white p-4 shadow-[0_8px_30px_-8px_rgba(24,24,27,0.14)] ring-1 ring-black/[0.04] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(24,24,27,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100 dark:bg-zinc-900 dark:shadow-[0_12px_36px_-8px_rgba(0,0,0,0.5)] dark:ring-white/[0.06] dark:focus-visible:ring-offset-zinc-950"
    >
      <GradientIcon icon={Icon} gradient={gradient} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </span>
        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-zinc-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-teal-500 dark:text-zinc-600"
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
    <li className="flex min-w-[9.5rem] shrink-0 flex-col gap-2 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/80 p-3.5 shadow-sm ring-1 ring-emerald-200/60 dark:from-emerald-950/40 dark:to-teal-950/30 dark:ring-emerald-800/40">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-500/25">
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
      <span className="text-sm font-semibold leading-tight text-emerald-950 dark:text-emerald-100">
        {label}
      </span>
      <span className="text-[11px] leading-snug text-emerald-700/80 dark:text-emerald-400/80">
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

      <div className="relative z-10 -mt-12 flex min-h-0 flex-1 flex-col overflow-y-auto bg-gradient-to-b from-stone-100 via-stone-50 to-stone-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
        <div className="space-y-5 px-4 pb-8 pt-2 lg:mx-auto lg:grid lg:w-full lg:max-w-5xl lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0 lg:px-6">
          {error ? (
            <FloatingCard className="lg:col-span-2">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void load();
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-900/50"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden />
                Try again
              </button>
            </FloatingCard>
          ) : null}

          {!hasAccounts ? (
            <FloatingCard className="text-center lg:col-span-2">
              <GradientIcon icon={Sparkles} gradient="amber" size="lg" />
              <p className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Ready when you are
              </p>
              <p className="mx-auto mt-1.5 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
                Link your first account on Portfolio to start tracking progress
                toward freedom.
              </p>
              <Link
                href="/portfolio"
                className="mt-5 inline-flex h-12 min-w-[11rem] items-center justify-center rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                Go to Portfolio
              </Link>
            </FloatingCard>
          ) : null}

          {showBudgetSetup ? (
            <FloatingCard className="lg:col-span-2">
              <div className="flex items-start gap-3">
                <GradientIcon icon={LayoutGrid} gradient="teal" />
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    Set up your budget
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Add bucket targets to see monthly progress and savings rate
                    here.
                  </p>
                  <Link
                    href="/budget"
                    className="mt-3 inline-flex text-sm font-semibold text-teal-600 transition-colors hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
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
              className="block rounded-3xl bg-white p-5 shadow-[0_12px_40px_-12px_rgba(24,24,27,0.18)] ring-1 ring-black/[0.04] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_20px_48px_-12px_rgba(20,184,166,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:bg-zinc-900 dark:ring-white/[0.06] dark:hover:shadow-[0_20px_48px_-12px_rgba(20,184,166,0.15)] lg:order-1 lg:self-stretch"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
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
                    <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                      Left to spend
                    </p>
                    <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-white">
                      {formatCurrency(Math.max(0, leftToSpend))}
                    </p>
                  </div>
                ) : null}
                {savingsRate != null ? (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                      Savings rate
                    </p>
                    <p
                      className={`mt-1 text-3xl font-bold tabular-nums tracking-tight ${
                        savingsRate >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
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
              <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
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
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-600 p-5 text-white shadow-[0_16px_48px_-12px_rgba(16,185,129,0.45)] lg:order-2 lg:self-stretch">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100/80">
                The 4% rule
              </p>
              <p className="mt-3 text-4xl font-bold tabular-nums tracking-tight">
                {formatCurrency(fourPercentMonthly)}
              </p>
              <p className="text-xs font-medium text-emerald-100/90">per month</p>
              <p className="mt-3 text-sm leading-relaxed text-emerald-50/90">
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
                  gradient="amber"
                />
              ) : null}
              <ActionCard
                href="/budget"
                title="Budget"
                description="Buckets, spending, and what's left"
                icon={LayoutGrid}
                gradient="teal"
              />
              <ActionCard
                href="/portfolio"
                title="Portfolio"
                description="Accounts and how your assets are growing"
                icon={PieChart}
                gradient="violet"
              />
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
