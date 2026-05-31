"use client";

import type { AccountHoldingsResponse } from "@/lib/account-holdings";
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from "@/lib/format";

type AccountHoldingsListProps = {
  data: AccountHoldingsResponse;
  currency: string;
};

function gainClass(value: number | null): string {
  if (value == null || value === 0) {
    return "text-slate-500 dark:text-zinc-400";
  }
  return value > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

export function AccountHoldingsList({ data, currency }: AccountHoldingsListProps) {
  const { holdings, totalValue, totalGainLoss, totalGainLossPercent } = data;

  if (holdings.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-zinc-400">
        No individual holdings reported for this account.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 dark:divide-zinc-800 dark:border-zinc-700">
        {holdings.map((holding) => (
          <li
            key={holding.id}
            className="flex items-start justify-between gap-3 px-3 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium text-slate-900 dark:text-zinc-100">
                <span className="tabular-nums">{holding.symbol}</span>
                {holding.name !== holding.symbol ? (
                  <span className="ml-1.5 font-normal text-slate-500 dark:text-zinc-400">
                    {holding.name}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                {holding.quantity.toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })}{" "}
                {holding.quantity === 1 ? "share" : "shares"}
                {holding.price != null
                  ? ` · ${formatCurrency(holding.price, currency)}/sh`
                  : null}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-medium tabular-nums text-slate-900 dark:text-zinc-100">
                {formatCurrency(holding.value, currency)}
              </p>
              {holding.gainLoss != null ? (
                <p
                  className={`mt-0.5 text-xs font-medium tabular-nums ${gainClass(holding.gainLoss)}`}
                >
                  {formatSignedCurrency(holding.gainLoss, currency)}
                  {holding.gainLossPercent != null ? (
                    <span className="ml-1">
                      ({formatPercent(holding.gainLossPercent)})
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-400 dark:text-zinc-500">
                  Gain/loss unavailable
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-zinc-800/60">
        <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
          Total
        </span>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
            {formatCurrency(totalValue, currency)}
          </p>
          {totalGainLoss != null ? (
            <p
              className={`text-xs font-medium tabular-nums ${gainClass(totalGainLoss)}`}
            >
              {formatSignedCurrency(totalGainLoss, currency)}
              {totalGainLossPercent != null ? (
                <span className="ml-1">
                  ({formatPercent(totalGainLossPercent)})
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      {data.asOf ? (
        <p className="text-xs text-slate-400 dark:text-zinc-500">
          Prices as of {data.asOf}
        </p>
      ) : null}
    </div>
  );
}
