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
      <section className="border-t border-hairline">
        <div className="divide-y divide-line-soft px-2">
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
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
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
