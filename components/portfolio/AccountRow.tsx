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
      className="flex w-full items-start gap-3 rounded-2xl px-2 py-3.5 text-left transition-[background-color,transform] hover:bg-canvas-sunken active:scale-[0.99]"
    >
      <InstitutionAvatar account={account} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-ink">
          <span>{account.name}</span>
          {account.assetClassOverride ? (
            <span
              className="ml-1 text-warn"
              title="Asset class overridden"
            >
              *
            </span>
          ) : null}
        </p>
        {account.subtitle ? (
          <p className="truncate text-sm text-ink-secondary">
            {account.subtitle}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`text-lg font-bold tabular-nums tracking-tight ${
            account.group === "Liabilities"
              ? "text-loss"
              : "text-ink"
          }`}
        >
          {formatAccountBalance(account)}
        </p>
        <div className="mt-0.5 flex flex-col items-end gap-0.5">
          <ChangeLabel amount={account.dailyChange} size="xs" />
          <p className="text-xs text-ink-muted">
            {secondaryLabel}
          </p>
        </div>
      </div>
    </button>
  );
}
