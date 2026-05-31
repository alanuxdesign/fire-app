import { formatCurrency, formatPercent } from "@/lib/format";
import { AccountRow } from "@/components/portfolio/AccountRow";
import type { AccountGroupResponse } from "@/lib/account-groups";

type AccountGroupProps = {
  group: AccountGroupResponse;
};

export function AccountGroup({ group }: AccountGroupProps) {
  const isPositive = group.monthlyChange >= 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">{group.type}</h2>
          <p className="text-lg font-bold tabular-nums text-slate-900">
            {formatCurrency(group.total)}
          </p>
        </div>
        <p className="mt-1 text-sm">
          <span
            className={`font-medium tabular-nums ${
              isPositive ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {isPositive ? "↗" : "↘"} {formatCurrency(Math.abs(group.monthlyChange))}{" "}
            ({formatPercent(group.monthlyChangePercent)})
          </span>{" "}
          <span className="text-slate-500">This month</span>
        </p>
      </div>

      <div className="divide-y divide-stone-100 px-4">
        {group.accounts.map((account) => (
          <AccountRow
            key={account.id}
            name={account.name}
            subtitle={account.subtitle}
            balance={account.currentBalance}
            currency={account.currency}
            institutionName={account.institutionName}
            updatedAt={account.updatedAt}
          />
        ))}
      </div>
    </section>
  );
}
