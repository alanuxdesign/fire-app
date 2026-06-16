import type { BudgetSummary } from "@/lib/budget-types";
import { formatCurrency } from "@/lib/format";

export const NET_WORTH_MILESTONES = [
  1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000,
] as const;

export type JourneyWin = {
  id: string;
  label: string;
  detail: string;
};

export type NextMilestone = {
  target: number;
  remaining: number;
  label: string;
  progress: number;
};

export function formatMilestoneLabel(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${amount / 1_000_000}M`;
  }
  if (amount >= 1_000) {
    return `$${amount / 1_000}k`;
  }
  return formatCurrency(amount);
}

export function getAchievedMilestones(netWorth: number): number[] {
  return NET_WORTH_MILESTONES.filter((m) => netWorth >= m);
}

export function getNextMilestone(netWorth: number): NextMilestone | null {
  const next = NET_WORTH_MILESTONES.find((m) => netWorth < m);
  if (!next) return null;
  const progress = netWorth <= 0 ? 0 : Math.min(1, netWorth / next);
  return {
    target: next,
    remaining: next - netWorth,
    label: formatMilestoneLabel(next),
    progress,
  };
}

export function computeFourPercentMonthly(netWorth: number): number {
  if (netWorth <= 0) return 0;
  return (netWorth * 0.04) / 12;
}

export function isGreenMonth(summary: BudgetSummary | null): boolean {
  if (!summary) return false;
  const budgetTotal = summary.effectiveBudgetTotal ?? summary.totalTarget;
  if (budgetTotal <= 0) return false;
  return summary.totalSpent <= budgetTotal;
}

export function getEncouragement(
  netWorth: number,
  summary: BudgetSummary | null,
): { headline: string; subline: string } {
  if (netWorth <= 0) {
    return {
      headline: "A fine place to begin",
      subline:
        "Link your first account, and every dollar you save takes root as visible growth.",
    };
  }

  const next = getNextMilestone(netWorth);
  const green = isGreenMonth(summary);

  if (green && summary?.savingsRate != null && summary.savingsRate > 0) {
    return {
      headline: "Thriving this month",
      subline: `You set aside ${summary.savingsRate.toFixed(0)}% of what came in. That's steady growth, taking root.`,
    };
  }

  if (green) {
    return {
      headline: "Growing steadily",
      subline: "Spending settled within your plan this month. Small seeds, real growth.",
    };
  }

  if (next && next.progress >= 0.85) {
    return {
      headline: `Almost to ${next.label}`,
      subline: `${formatCurrency(next.remaining)} to go — closer than it feels.`,
    };
  }

  const achieved = getAchievedMilestones(netWorth);
  if (achieved.length > 0) {
    const latest = achieved[achieved.length - 1];
    return {
      headline: "Quietly growing",
      subline: `Past ${formatMilestoneLabel(latest)}. A garden is made of seasons like this one.`,
    };
  }

  return {
    headline: "Still growing",
    subline: "Growth isn't always linear, but it's always real.",
  };
}

export function getJourneyWins(
  netWorth: number,
  summary: BudgetSummary | null,
): JourneyWin[] {
  const wins: JourneyWin[] = [];

  if (summary?.savingsRate != null && summary.savingsRate > 0) {
    wins.push({
      id: "savings-rate",
      label: "Taking root",
      detail: `${summary.savingsRate.toFixed(0)}% of income set aside to grow`,
    });
  }

  if (isGreenMonth(summary)) {
    wins.push({
      id: "green-month",
      label: "Growing steadily",
      detail: "Spending settled within your plan",
    });
  }

  const achieved = getAchievedMilestones(netWorth);
  if (achieved.length > 0) {
    const latest = achieved[achieved.length - 1];
    wins.push({
      id: `milestone-${latest}`,
      label: formatMilestoneLabel(latest) + " reached",
      detail: "A season on your path to freedom",
    });
  }

  return wins.slice(0, 4);
}

export function formatBudgetMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
