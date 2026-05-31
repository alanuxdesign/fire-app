import { formatCurrency, formatPercent } from "@/lib/format";

type NetWorthHeaderProps = {
  netWorth: number;
  changePercent: number;
};

export function NetWorthHeader({
  netWorth,
  changePercent,
}: NetWorthHeaderProps) {
  const isPositive = changePercent >= 0;

  return (
    <header className="shrink-0 bg-zinc-950 px-4 pb-8 pt-6 text-white">
      <p className="text-center text-sm font-medium tracking-wide text-zinc-400">
        Net Worth
      </p>
      <p className="mt-2 text-center text-4xl font-semibold tracking-tight tabular-nums">
        {formatCurrency(netWorth)}
      </p>
      <p
        className={`mt-1 text-center text-sm font-medium tabular-nums ${
          isPositive ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {isPositive ? "+" : ""}
        {formatPercent(changePercent)}
      </p>

      {/* Chart placeholder — Sprint 3 */}
      <div
        className="mt-8 h-36 w-full rounded-lg border border-dashed border-zinc-800/80"
        aria-hidden
      />
    </header>
  );
}
