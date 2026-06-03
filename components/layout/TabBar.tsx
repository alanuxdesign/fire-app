"use client";

import {
  CalendarDays,
  Home,
  LayoutGrid,
  PieChart,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  center?: boolean;
  badgeKey?: "budgetReview";
};

const tabs: Tab[] = [
  { href: "/budget", label: "Budget", icon: LayoutGrid, badgeKey: "budgetReview" },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/", label: "Home", icon: Home, center: true },
  { href: "/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar() {
  const pathname = usePathname();
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/budget/review-count");
        if (res.ok) {
          const body = (await res.json()) as { count: number };
          setReviewCount(body.count);
        }
      } catch {
        /* ignore */
      }
    };
    void load();

    const onCount = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === "number") setReviewCount(detail);
    };
    window.addEventListener("budget-review-count", onCount);
    return () => window.removeEventListener("budget-review-count", onCount);
  }, [pathname]);

  if (pathname === "/login" || pathname.startsWith("/api")) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.06)] dark:border-zinc-800 dark:bg-zinc-900"
      aria-label="Main navigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
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
              className={`relative flex flex-col items-center gap-0.5 px-1 py-2 transition-colors ${
                active
                  ? "font-semibold text-zinc-900 dark:text-zinc-100"
                  : "font-medium text-zinc-400 dark:text-zinc-500"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative">
                <Icon
                  className={center ? "h-7 w-7" : "h-5 w-5"}
                  strokeWidth={1.5}
                  aria-hidden
                />
                {badge ? (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
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
