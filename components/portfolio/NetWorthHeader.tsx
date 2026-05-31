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
    <div className="px-4 pt-6">
      <p className="text-center text-sm font-medium tracking-wide text-zinc-400">
        Net Worth
      </p>
      <p className="mt-2 text-center text-4xl font-semibold tracking-tight tabular-nums text-white transition-all duration-200">
        {formatCurrency(netWorth)}
      </p>
      <p
        className={`mt-1 text-center text-sm font-medium tabular-nums transition-colors duration-200 ${
          isPositive ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {isPositive && changePercent !== 0 ? "+" : ""}
        {formatPercent(changePercent)}
      </p>
    </div>
  );
}
