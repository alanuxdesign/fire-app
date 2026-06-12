"use client";

import { AccountDetailModal } from "@/components/portfolio/AccountDetailModal";
import { PORTFOLIO_FLOATING_CARD } from "@/components/portfolio/portfolioStyles";
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
        <div className={`${PORTFOLIO_FLOATING_CARD} px-4 py-10 text-center`}>
          <p className="text-base font-semibold text-ink">
            No accounts yet
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            Connect a bank or add an asset manually below.
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
