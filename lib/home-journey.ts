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
      headline: "Your journey starts here",
      subline:
        "Link your first account and every dollar you save becomes visible progress.",
    };
  }

  const next = getNextMilestone(netWorth);
  const green = isGreenMonth(summary);

  if (green && summary?.savingsRate != null && summary.savingsRate > 0) {
    return {
      headline: "A strong month",
      subline: `On track and saving ${summary.savingsRate.toFixed(0)}% of income. That momentum adds up.`,
    };
  }

  if (green) {
    return {
      headline: "On track this month",
      subline: "Spending is within your plan. Small wins stack into big ones.",
    };
  }

  if (next && next.progress >= 0.85) {
    return {
      headline: `Almost at ${next.label}`,
      subline: `${formatCurrency(next.remaining)} to go. Closer than it feels.`,
    };
  }

  const achieved = getAchievedMilestones(netWorth);
  if (achieved.length > 0) {
    const latest = achieved[achieved.length - 1];
    return {
      headline: "You're building something real",
      subline: `Past ${formatMilestoneLabel(latest)}. The marathon is made of steps like this.`,
    };
  }

  return {
    headline: "Every step counts",
    subline: "Progress is not always linear, but it is always meaningful.",
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
      label: "Saving this month",
      detail: `${summary.savingsRate.toFixed(0)}% of income set aside`,
    });
  }

  if (isGreenMonth(summary)) {
    wins.push({
      id: "green-month",
      label: "On track",
      detail: "Spending is within your monthly budget",
    });
  }

  const achieved = getAchievedMilestones(netWorth);
  if (achieved.length > 0) {
    const latest = achieved[achieved.length - 1];
    wins.push({
      id: `milestone-${latest}`,
      label: formatMilestoneLabel(latest) + " reached",
      detail: "A milestone on your path to independence",
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
