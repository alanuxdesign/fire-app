"use client";

import { ChangeLabel } from "@/components/portfolio/ChangeLabel";
import { AccountRow } from "@/components/portfolio/AccountRow";
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
    <section className="border-t border-hairline pt-5">
      <div className="flex items-end justify-between gap-3 px-2">
        <div>
          <h2 className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
            {group.type}
          </h2>
          <p
            className={`mt-1.5 text-[1.6rem] font-semibold tabular-nums tracking-[-0.02em] ${
              liability ? "text-ink-soft" : "text-ink"
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
            <span className="mt-0.5 block text-ink-faint">This month</span>
          </p>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-full p-1.5 text-ink-faint transition-colors hover:bg-sage-wash hover:text-ink-secondary lg:inline-flex"
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

      <div
        className={`mt-2 divide-y divide-line-soft px-2 ${
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
