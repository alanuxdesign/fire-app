import { ChangeLabel } from "@/components/portfolio/ChangeLabel";
import { AccountRow } from "@/components/portfolio/AccountRow";
import type {
  AccountGroupResponse,
  AccountListItem,
} from "@/lib/account-groups";
import { formatGroupTotal, isLiabilityGroupName } from "@/lib/account-display";

type AccountGroupProps = {
  group: AccountGroupResponse;
  onAccountClick: (account: AccountListItem) => void;
};

export function AccountGroup({ group, onAccountClick }: AccountGroupProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-stone-100 px-4 pt-4 pb-3 dark:border-zinc-800">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
            {group.type}
          </h2>
          <p
            className={`text-lg font-bold tabular-nums ${
              isLiabilityGroupName(group.type)
                ? "text-red-600 dark:text-red-400"
                : "text-slate-900 dark:text-zinc-100"
            }`}
          >
            {formatGroupTotal(group.total, {
              isLiabilityGroup: isLiabilityGroupName(group.type),
            })}
          </p>
        </div>
        <p className="mt-1 text-sm">
          <ChangeLabel
            amount={group.monthlyChange}
            percent={group.monthlyChangePercent}
            showPercent
          />{" "}
          <span className="text-slate-500 dark:text-zinc-400">This month</span>
        </p>
      </div>

      <div className="divide-y divide-stone-100 px-4 dark:divide-zinc-800">
        {group.accounts.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            onClick={onAccountClick}
          />
        ))}
      </div>
    </section>
  );
}
