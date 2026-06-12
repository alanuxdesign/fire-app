import { formatCurrency, formatPercent, formatSignedCurrency } from "@/lib/format";

type NetWorthHeaderProps = {
  netWorth: number;
  changeAmount: number;
  changePercent: number;
  changeHorizonLabel: string;
  showBackToToday: boolean;
  isEstimated?: boolean;
  onBackToToday: () => void;
  size?: "default" | "hero";
};

export function NetWorthHeader({
  netWorth,
  changeAmount,
  changePercent,
  changeHorizonLabel,
  showBackToToday,
  isEstimated = false,
  onBackToToday,
  size = "default",
}: NetWorthHeaderProps) {
  const isPositive = changePercent >= 0;
  const hero = size === "hero";

  return (
    <div className={`relative px-4 ${hero ? "pt-8" : "pt-6"}`}>
      {showBackToToday ? (
        <button
          type="button"
          onClick={onBackToToday}
          className={`absolute left-3 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 shadow-lg ring-1 ring-white/10 transition-colors hover:bg-white/15 ${
            hero ? "top-8" : "top-6"
          }`}
        >
          Back to Today
        </button>
      ) : null}
      <p
        className={
          hero
            ? "text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300/80"
            : "text-center text-sm font-medium tracking-wide text-zinc-400"
        }
      >
        {isEstimated
          ? hero
            ? "Estimated net worth"
            : "Estimated Net Worth"
          : hero
            ? "Portfolio"
            : "Net Worth"}
      </p>
      <p
        className={`text-center font-bold tracking-tight tabular-nums text-white transition-all duration-200 ${
          hero
            ? "mt-3 text-[clamp(2.75rem,14vw,3.5rem)] leading-none drop-shadow-sm"
            : "mt-2 text-4xl font-semibold"
        }`}
      >
        {formatCurrency(netWorth)}
      </p>
      <p
        className={`text-center font-medium tabular-nums transition-colors duration-200 ${
          hero ? "mt-2 text-xs" : "mt-1 text-sm"
        }`}
      >
        <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
          {formatSignedCurrency(changeAmount)}
          {Number.isFinite(changePercent) ? (
            <> ({formatPercent(changePercent)})</>
          ) : null}
        </span>
        <span className={hero ? "text-zinc-600" : "text-zinc-500"}>
          {" "}
          · {changeHorizonLabel}
        </span>
      </p>
    </div>
  );
}
