import { Fragment } from "react";
import { ChangeLabel } from "@/components/portfolio/ChangeLabel";
import { PORTFOLIO_FLOATING_CARD } from "@/components/portfolio/portfolioStyles";
import type { AccountGroupResponse, AccountListItem } from "@/lib/account-groups";
import { formatAccountBalance, formatGroupTotal, isLiabilityGroupName } from "@/lib/account-display";
import { formatPercent } from "@/lib/format";
import {
  buildTableRows,
  type GroupingMode,
  type TableRow,
} from "@/lib/portfolio-views";
import type { AccountsApiResponse } from "@/lib/account-groups";

type PortfolioTableViewProps = {
  groups: AccountGroupResponse[];
  grouping: GroupingMode;
  data: AccountsApiResponse;
  onAccountClick: (account: AccountListItem) => void;
};

function AccountNameCell({ row }: { row: TableRow }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{row.name}</span>
      {row.assetClassOverride ? (
        <span
          className="text-amber-600 dark:text-amber-400"
          title="Asset class overridden"
        >
          *
        </span>
      ) : null}
    </span>
  );
}

function TableAccountRow({
  row,
  onAccountClick,
}: {
  row: TableRow;
  onAccountClick: (account: AccountListItem) => void;
}) {
  return (
    <tr
      className="cursor-pointer text-slate-800 transition-colors hover:bg-stone-50/80 dark:text-zinc-200 dark:hover:bg-zinc-800/50"
      onClick={() => onAccountClick(row)}
    >
      <td className="px-3 py-2.5 font-medium">
        <AccountNameCell row={row} />
      </td>
      <td className="px-3 py-2.5 text-slate-600 dark:text-zinc-400">
        {row.institution}
      </td>
      <td className="px-3 py-2.5 capitalize text-slate-600 dark:text-zinc-400">
        {row.subtitle ?? row.type}
      </td>
      <td className="px-3 py-2.5 text-slate-600 dark:text-zinc-400">
        {row.assetClass}
      </td>
      <td
        className={`px-3 py-2.5 text-right font-medium tabular-nums ${
          row.group === "Liabilities"
            ? "text-red-600 dark:text-red-400"
            : ""
        }`}
      >
        {formatAccountBalance(row)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-zinc-400">
        {formatPercent(row.percentOfPortfolio, { signed: false })}
      </td>
      <td className="px-3 py-2.5 text-right">
        <ChangeLabel amount={row.dailyChange} size="xs" />
      </td>
    </tr>
  );
}

export function PortfolioTableView({
  groups,
  grouping,
  data,
  onAccountClick,
}: PortfolioTableViewProps) {
  const showGroupHeaders = grouping !== "ungrouped";

  if (groups.length === 0) {
    return null;
  }

  const sections = showGroupHeaders
    ? groups.map((group) => ({
        key: group.type,
        label: group.type,
        total: group.total,
        rows: buildTableRows(group.accounts, data),
      }))
    : [
        {
          key: "all",
          label: null,
          total: null,
          rows: buildTableRows(
            groups.flatMap((group) => group.accounts),
            data,
          ),
        },
      ];

  const hasRows = sections.some((section) => section.rows.length > 0);

  if (!hasRows) {
    return null;
  }

  return (
    <div className={`overflow-hidden ${PORTFOLIO_FLOATING_CARD}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Institution</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Asset Class</th>
              <th className="px-3 py-2.5 text-right">Balance</th>
              <th className="px-3 py-2.5 text-right">% of Portfolio</th>
              <th className="px-3 py-2.5 text-right">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-zinc-800">
            {sections.map((section) => (
              <Fragment key={section.key}>
                {section.label ? (
                  <tr
                    className="bg-stone-50/60 dark:bg-zinc-800/40"
                  >
                    <td
                      colSpan={5}
                      className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-300"
                    >
                      {section.label}
                    </td>
                    <td
                      className={`px-3 py-2 text-right text-xs font-semibold tabular-nums ${
                        section.label && isLiabilityGroupName(section.label)
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-700 dark:text-zinc-200"
                      }`}
                    >
                      {section.total !== null
                        ? formatGroupTotal(section.total, {
                            isLiabilityGroup: section.label
                              ? isLiabilityGroupName(section.label)
                              : false,
                          })
                        : null}
                    </td>
                  </tr>
                ) : null}
                {section.rows.map((row) => (
                  <TableAccountRow
                    key={row.id}
                    row={row}
                    onAccountClick={onAccountClick}
                  />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
