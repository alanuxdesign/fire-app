"use client";

import { ChangeLabel } from "@/components/portfolio/ChangeLabel";
import { AccountRow } from "@/components/portfolio/AccountRow";
import { PORTFOLIO_FLOATING_CARD } from "@/components/portfolio/portfolioStyles";
import type {
  AccountGroupResponse,
  AccountListItem,
} from "@/lib/account-groups";
import { formatGroupTotal, isLiabilityGroupName } from "@/lib/account-display";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

type AccountGroupProps = {
  group: AccountGroupResponse;
  onAccountClick: (account: AccountListItem) => void;
};

export function AccountGroup({ group, onAccountClick }: AccountGroupProps) {
  const liability = isLiabilityGroupName(group.type);
  // Desktop-only collapse; the toggle is hidden below lg and the account list
  // ignores the state there, so mobile always shows everything.
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className={`overflow-hidden ${PORTFOLIO_FLOATING_CARD}`}>
      <div className="bg-gradient-to-r from-canvas-sunken/60 to-surface px-4 pb-3 pt-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-ink-secondary">
              {group.type}
            </h2>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${
                liability
                  ? "text-loss"
                  : "text-ink"
              }`}
            >
              {formatGroupTotal(group.total, {
                isLiabilityGroup: liability,
              })}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-right text-[11px] tabular-nums">
              <ChangeLabel
                amount={group.monthlyChange}
                percent={group.monthlyChangePercent}
                showPercent
                size="xs"
              />
              <span className="mt-0.5 block text-ink-muted">This month</span>
            </p>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="hidden rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-canvas-sunken hover:text-ink-secondary lg:inline-flex"
              aria-expanded={!collapsed}
              aria-label={`${collapsed ? "Expand" : "Collapse"} ${group.type}`}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`divide-y divide-hairline/80 px-2 ${
          collapsed ? "lg:hidden" : ""
        }`}
      >
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
