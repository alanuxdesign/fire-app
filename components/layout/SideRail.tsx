import { isActive, tabs } from "@/components/layout/navConfig";
import Link from "next/link";

type SideRailProps = {
  pathname: string;
  reviewCount: number;
};

// Vertical order for the rail; Settings is pinned to the bottom separately.
const railOrder = ["/", "/budget", "/planner", "/portfolio"];

export function SideRail({ pathname, reviewCount }: SideRailProps) {
  const mainItems = railOrder
    .map((href) => tabs.find((t) => t.href === href))
    .filter((t): t is (typeof tabs)[number] => Boolean(t));
  const settingsItem = tabs.find((t) => t.href === "/settings");

  const renderItem = (tab: (typeof tabs)[number]) => {
    const { href, label, icon: Icon, badgeKey } = tab;
    const active = isActive(pathname, href);
    const badge =
      badgeKey === "budgetReview" && reviewCount > 0
        ? reviewCount > 9
          ? "9+"
          : String(reviewCount)
        : null;

    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
          active
            ? "bg-stone-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
            : "font-medium text-zinc-500 hover:bg-stone-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
        }`}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        <span>{label}</span>
        {badge ? (
          <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-zinc-200 bg-white px-3 py-6 dark:border-zinc-800 dark:bg-zinc-900 lg:flex"
    >
      <p className="px-3 pb-6 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Fire
      </p>
      <div className="flex flex-col gap-1">{mainItems.map(renderItem)}</div>
      {settingsItem ? (
        <div className="mt-auto flex flex-col gap-1">
          {renderItem(settingsItem)}
        </div>
      ) : null}
    </nav>
  );
}
