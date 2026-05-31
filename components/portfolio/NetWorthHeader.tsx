import { formatCurrency, formatPercent } from "@/lib/format";

type NetWorthHeaderProps = {
  netWorth: number;
  changePercent: number;
  changeHorizonLabel: string;
  showBackToToday: boolean;
  onBackToToday: () => void;
};

export function NetWorthHeader({
  netWorth,
  changePercent,
  changeHorizonLabel,
  showBackToToday,
  onBackToToday,
}: NetWorthHeaderProps) {
  const isPositive = changePercent >= 0;

  return (
    <div className="relative px-4 pt-6">
      {showBackToToday ? (
        <button
          type="button"
          onClick={onBackToToday}
          className="absolute left-0 top-6 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
        >
          Back to Today
        </button>
      ) : null}
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
        {formatPercent(changePercent)}
        <span className="ml-1 text-zinc-500">· {changeHorizonLabel}</span>
      </p>
    </div>
  );
}
