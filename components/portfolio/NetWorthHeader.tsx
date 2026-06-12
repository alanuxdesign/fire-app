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
          className={`absolute left-3 rounded-full bg-surface/80 px-3 py-1.5 text-xs font-semibold text-ink-secondary shadow-soft ring-1 ring-hairline transition-colors hover:bg-surface ${
            hero ? "top-8" : "top-6"
          }`}
        >
          Back to Today
        </button>
      ) : null}
      <p
        className={
          hero
            ? "text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-primary"
            : "text-center text-sm font-medium tracking-wide text-ink-muted"
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
        className={`text-center font-bold tracking-tight tabular-nums text-ink transition-all duration-200 ${
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
        <span className={isPositive ? "text-gain" : "text-loss"}>
          {formatSignedCurrency(changeAmount)}
          {Number.isFinite(changePercent) ? (
            <> ({formatPercent(changePercent)})</>
          ) : null}
        </span>
        <span className="text-ink-muted">
          {" "}
          · {changeHorizonLabel}
        </span>
      </p>
    </div>
  );
}
