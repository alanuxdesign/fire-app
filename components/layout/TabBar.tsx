import { isActive, tabs } from "@/components/layout/navConfig";
import Link from "next/link";

type TabBarProps = {
  pathname: string;
  reviewCount: number;
};

export function TabBar({ pathname, reviewCount }: TabBarProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-paper-2 lg:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-1.5">
        {tabs.map(({ href, label, icon: Icon, center, badgeKey }) => {
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
              className={`relative flex flex-col items-center gap-1 px-1 py-1.5 transition-colors ${
                active
                  ? "font-bold text-sage-deep"
                  : "font-medium text-ink-muted"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`relative flex items-center justify-center rounded-full transition-colors ${
                  center ? "h-9 w-12" : "h-7 w-11"
                } ${active ? "bg-sage-wash" : ""}`}
              >
                <Icon
                  className={center ? "h-6 w-6" : "h-5 w-5"}
                  strokeWidth={active ? 2 : 1.5}
                  aria-hidden
                />
                {badge ? (
                  <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[9px] font-bold text-on-primary">
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className="text-[10px] leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
