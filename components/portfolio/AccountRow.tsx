import { ChangeLabel } from "@/components/portfolio/ChangeLabel";
import { InstitutionAvatar } from "@/components/portfolio/InstitutionAvatar";
import type { AccountListItem } from "@/lib/account-groups";
import { formatAccountBalance } from "@/lib/account-display";
import { formatRelativeTime } from "@/lib/format";
import { formatPurchaseDateLabel } from "@/lib/purchase-date";

type AccountRowProps = {
  account: AccountListItem;
  onClick: (account: AccountListItem) => void;
};

export function AccountRow({ account, onClick }: AccountRowProps) {
  const updatedDate = new Date(account.updatedAt);
  const secondaryLabel =
    account.isManual && account.purchaseDate
      ? `Purchased ${formatPurchaseDateLabel(account.purchaseDate)}`
      : `Updated ${formatRelativeTime(updatedDate)}`;

  return (
    <button
      type="button"
      onClick={() => onClick(account)}
      className="flex w-full items-start gap-3 rounded-2xl px-2 py-3.5 text-left transition-[background-color,transform] hover:bg-teal-50/50 active:scale-[0.99] dark:hover:bg-teal-950/20"
    >
      <InstitutionAvatar account={account} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-slate-900 dark:text-zinc-100">
          <span>{account.name}</span>
          {account.assetClassOverride ? (
            <span
              className="ml-1 text-amber-600 dark:text-amber-400"
              title="Asset class overridden"
            >
              *
            </span>
          ) : null}
        </p>
        {account.subtitle ? (
          <p className="truncate text-sm text-slate-500 dark:text-zinc-400">
            {account.subtitle}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`text-lg font-bold tabular-nums tracking-tight ${
            account.group === "Liabilities"
              ? "text-rose-500"
              : "text-zinc-900 dark:text-zinc-50"
          }`}
        >
          {formatAccountBalance(account)}
        </p>
        <div className="mt-0.5 flex flex-col items-end gap-0.5">
          <ChangeLabel amount={account.dailyChange} size="xs" />
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            {secondaryLabel}
          </p>
        </div>
      </div>
    </button>
  );
}
