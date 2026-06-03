export type SubscriptionItem = {
  id: string;
  merchantKey: string;
  displayName: string;
  expectedAmount: number;
  cadence: string;
  nextExpectedDate: string | null;
  isConfirmed: boolean;
  categoryId: string | null;
};

export type SubscriptionsResponse = {
  subscriptions: SubscriptionItem[];
  pending: SubscriptionItem[];
  confirmed: SubscriptionItem[];
  monthlyTotal: number;
  pendingMonthlyTotal: number;
};

export type SubscriptionsSummary = {
  monthlyTotal: number;
  pendingCount: number;
  confirmedCount: number;
  totalCount: number;
};

export async function fetchSubscriptions(): Promise<SubscriptionsResponse | null> {
  const res = await fetch("/api/budget/subscriptions");
  if (!res.ok) return null;
  return (await res.json()) as SubscriptionsResponse;
}

export function toSubscriptionsSummary(
  data: SubscriptionsResponse,
): SubscriptionsSummary {
  return {
    monthlyTotal: data.monthlyTotal,
    pendingCount: data.pending.length,
    confirmedCount: data.confirmed.length,
    totalCount: data.subscriptions.length,
  };
}
