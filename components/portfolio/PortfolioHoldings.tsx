"use client";

import { AccountDetailModal } from "@/components/portfolio/AccountDetailModal";
import { PortfolioControls } from "@/components/portfolio/PortfolioControls";
import { PortfolioListView } from "@/components/portfolio/PortfolioListView";
import { PortfolioPieChart } from "@/components/portfolio/PortfolioPieChart";
import { PortfolioTableView } from "@/components/portfolio/PortfolioTableView";
import type { AccountListItem, AccountsApiResponse } from "@/lib/account-groups";
import {
  flattenAccounts,
  groupAccounts,
  type GroupingMode,
  type ViewMode,
} from "@/lib/portfolio-views";
import { useEffect, useMemo, useState } from "react";

type PortfolioHoldingsProps = {
  data: AccountsApiResponse;
  onAccountsChange: () => void;
  readOnly?: boolean;
};

export function PortfolioHoldings({
  data,
  onAccountsChange,
  readOnly = false,
}: PortfolioHoldingsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [grouping, setGrouping] = useState<GroupingMode>("type");
  const [selectedAccount, setSelectedAccount] = useState<AccountListItem | null>(
    null,
  );

  const accounts = useMemo(() => flattenAccounts(data), [data]);

  const groups = useMemo(
    () => groupAccounts(accounts, grouping),
    [accounts, grouping],
  );

  const hasHoldings = accounts.length > 0;

  const handleAccountClick = (account: AccountListItem) => {
    setSelectedAccount(account);
  };

  useEffect(() => {
    if (!selectedAccount) {
      return;
    }
    const next = accounts.find((item) => item.id === selectedAccount.id);
    if (next) {
      setSelectedAccount(next);
    } else {
      setSelectedAccount(null);
    }
  }, [accounts, selectedAccount?.id]);

  const handleModalUpdated = () => {
    void onAccountsChange();
  };

  return (
    <div className="space-y-4">
      <PortfolioControls
        viewMode={viewMode}
        grouping={grouping}
        onViewModeChange={setViewMode}
        onGroupingChange={setGrouping}
      />

      {!hasHoldings ? (
        <div className="border-t border-hairline px-4 py-10 text-center">
          <p className="font-display text-[1.35rem] leading-tight text-ink">
            Nothing planted here yet
          </p>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-soft">
            Link a bank or add an asset below, and it&apos;ll start showing its
            growth.
          </p>
        </div>
      ) : null}

      {hasHoldings && viewMode === "list" ? (
        <PortfolioListView
          groups={groups}
          grouping={grouping}
          onAccountClick={handleAccountClick}
        />
      ) : null}

      {hasHoldings && viewMode === "pie" ? (
        <PortfolioPieChart
          groups={groups}
          data={data}
          onAccountClick={handleAccountClick}
        />
      ) : null}

      {hasHoldings && viewMode === "table" ? (
        <PortfolioTableView
          groups={groups}
          grouping={grouping}
          data={data}
          onAccountClick={handleAccountClick}
        />
      ) : null}

      <AccountDetailModal
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onUpdated={handleModalUpdated}
        readOnly={readOnly}
      />
    </div>
  );
}
