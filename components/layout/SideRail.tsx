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
        className={`flex items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-colors ${
          active
            ? "bg-sage-wash font-bold text-sage-deep"
            : "font-medium text-ink-secondary hover:bg-sage-wash/60"
        }`}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} aria-hidden />
        <span>{label}</span>
        {badge ? (
          <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[9px] font-bold text-on-primary">
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-hairline bg-paper-2 px-3 py-6 lg:flex"
    >
      <p className="px-3 pb-6 font-display text-2xl tracking-[-0.015em] text-terra">
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
