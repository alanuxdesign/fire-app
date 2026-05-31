import type { SnapshotRange, SnapshotSummary } from "@/lib/snapshots";

export type NetWorthChartPoint = {
  date: string;
  label: string;
  netWorth: number;
};

export function formatChartLabel(
  dateStr: string,
  range: SnapshotRange,
): string {
  const date = new Date(`${dateStr}T12:00:00`);

  if (range === "1M" || range === "3M") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (range === "ALL" || range === "1Y") {
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  return date.toLocaleDateString("en-US", { month: "short" });
}

export function buildNetWorthChartData(
  snapshots: SnapshotSummary[],
  currentNetWorth: number,
  range: SnapshotRange,
): NetWorthChartPoint[] {
  if (snapshots.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return [
      {
        date: today,
        label: formatChartLabel(today, range),
        netWorth: currentNetWorth,
      },
    ];
  }

  return snapshots.map((snapshot) => ({
    date: snapshot.date,
    label: formatChartLabel(snapshot.date, range),
    netWorth: snapshot.netWorth,
  }));
}

export function computeNetWorthChange(
  value: number,
  baseline: number,
): { changeAmount: number; changePercent: number } {
  const changeAmount = value - baseline;
  const changePercent =
    baseline !== 0 ? (changeAmount / Math.abs(baseline)) * 100 : 0;

  return { changeAmount, changePercent };
}
