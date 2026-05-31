import { AccountGroup } from "@/components/portfolio/AccountGroup";
import { AccountRow } from "@/components/portfolio/AccountRow";
import type { AccountGroupResponse, AccountListItem } from "@/lib/account-groups";
import type { GroupingMode } from "@/lib/portfolio-views";

type PortfolioListViewProps = {
  groups: AccountGroupResponse[];
  grouping: GroupingMode;
  onAccountClick: (account: AccountListItem) => void;
};

export function PortfolioListView({
  groups,
  grouping,
  onAccountClick,
}: PortfolioListViewProps) {
  if (groups.length === 0) {
    return null;
  }

  if (grouping === "ungrouped") {
    const accounts = groups[0]?.accounts ?? [];

    return (
      <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="divide-y divide-stone-100 px-4 dark:divide-zinc-800">
          {accounts.map((account) => (
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

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <AccountGroup
          key={group.type}
          group={group}
          onAccountClick={onAccountClick}
        />
      ))}
    </div>
  );
}
