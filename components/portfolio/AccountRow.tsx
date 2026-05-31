import { ChangeLabel } from "@/components/portfolio/ChangeLabel";
import type { AccountListItem } from "@/lib/account-groups";
import { formatCurrency, formatRelativeTime } from "@/lib/format";

type AccountRowProps = {
  account: AccountListItem;
  onClick: (account: AccountListItem) => void;
};

const INSTITUTION_COLORS = [
  "bg-sky-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
];

function getInstitutionColor(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) ?? 0);
  return INSTITUTION_COLORS[code % INSTITUTION_COLORS.length];
}

export function AccountRow({ account, onClick }: AccountRowProps) {
  const label = account.institutionName ?? account.name;
  const initial = label.charAt(0).toUpperCase();
  const updatedDate = new Date(account.updatedAt);

  return (
    <button
      type="button"
      onClick={() => onClick(account)}
      className="flex w-full items-start gap-3 py-3.5 text-left transition-colors hover:bg-stone-50/80 dark:hover:bg-zinc-800/40"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${getInstitutionColor(label)}`}
        aria-hidden
      >
        {initial}
      </div>

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
        <p className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
          {formatCurrency(account.currentBalance, account.currency)}
        </p>
        <div className="mt-0.5 flex flex-col items-end gap-0.5">
          <ChangeLabel amount={account.dailyChange} size="xs" />
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            {formatRelativeTime(updatedDate)}
          </p>
        </div>
      </div>
    </button>
  );
}
