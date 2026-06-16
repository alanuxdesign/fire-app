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
          className={`absolute left-3 rounded-full border border-hairline bg-paper-2/80 px-3 py-1.5 text-xs font-semibold text-ink-secondary transition-colors hover:bg-paper-2 ${
            hero ? "top-8" : "top-6"
          }`}
        >
          Back to today
        </button>
      ) : null}
      <p
        className={
          hero
            ? "text-center text-[11.5px] font-bold uppercase tracking-[0.16em] text-terra"
            : "text-center text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint"
        }
      >
        {isEstimated ? "Estimated net worth" : hero ? "Your portfolio" : "Net worth"}
      </p>
      <p
        className={`text-center font-semibold tracking-[-0.02em] tabular-nums text-ink transition-all duration-200 ${
          hero
            ? "mt-3 text-[clamp(2.75rem,13vw,3.4rem)] leading-none"
            : "mt-2 text-4xl"
        }`}
      >
        {formatCurrency(netWorth)}
      </p>
      <p
        className={`text-center font-medium tabular-nums transition-colors duration-200 ${
          hero ? "mt-2.5 text-[13px]" : "mt-1 text-sm"
        }`}
      >
        <span className={isPositive ? "text-sage" : "text-ink-soft"}>
          {formatSignedCurrency(changeAmount)}
          {Number.isFinite(changePercent) ? (
            <> ({formatPercent(changePercent)})</>
          ) : null}
        </span>
        <span className="text-ink-faint">
          {" "}
          · {changeHorizonLabel}
        </span>
      </p>
    </div>
  );
}
