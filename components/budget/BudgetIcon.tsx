import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

type BudgetIconProps = {
  name: string;
  className?: string;
  strokeWidth?: number;
};

export function BudgetIcon({
  name,
  className = "h-5 w-5",
  strokeWidth = 1.5,
}: BudgetIconProps) {
  const Icon =
    (Icons as unknown as Record<string, LucideIcon>)[name] ??
    Icons.CircleDollarSign;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}
