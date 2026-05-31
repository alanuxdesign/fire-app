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

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  center?: boolean;
};

const tabs: Tab[] = [
  { href: "/budget", label: "Budget", icon: LayoutGrid },
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

  if (pathname === "/login" || pathname.startsWith("/api")) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.06)] dark:border-zinc-800 dark:bg-zinc-900"
      aria-label="Main navigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {tabs.map(({ href, label, icon: Icon, center }) => {
          const active = isActive(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-1 py-2 transition-colors ${
                active
                  ? "font-semibold text-zinc-900 dark:text-zinc-100"
                  : "font-medium text-zinc-400 dark:text-zinc-500"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={center ? "h-7 w-7" : "h-5 w-5"}
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="text-[10px] leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
