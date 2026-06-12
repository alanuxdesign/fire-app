import { formatPercent, formatSignedCurrency } from "@/lib/format";

type ChangeLabelProps = {
  amount: number;
  percent?: number;
  showPercent?: boolean;
  size?: "sm" | "xs";
};

export function ChangeLabel({
  amount,
  percent,
  showPercent = false,
  size = "sm",
}: ChangeLabelProps) {
  const isPositive = amount >= 0;
  const className =
    size === "xs"
      ? "text-xs font-medium tabular-nums"
      : "text-sm font-medium tabular-nums";

  return (
    <span
      className={`${className} ${
        isPositive ? "text-gain" : "text-loss"
      }`}
    >
      {isPositive ? "↗" : "↘"} {formatSignedCurrency(Math.abs(amount))}
      {showPercent && percent !== undefined ? (
        <> ({formatPercent(percent)})</>
      ) : null}
    </span>
  );
}
