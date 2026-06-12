import {
  CalendarDays,
  Home,
  LayoutGrid,
  PieChart,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  center?: boolean;
  badgeKey?: "budgetReview";
};

export const tabs: Tab[] = [
  { href: "/budget", label: "Budget", icon: LayoutGrid, badgeKey: "budgetReview" },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/", label: "Home", icon: Home, center: true },
  { href: "/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
