import type { ElementType, ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  /** Extra classes merged after the base card classes. */
  className?: string;
  /** Render as a different element, e.g. "section". */
  as?: ElementType;
};

/** Standard flat card per DESIGN.md: bordered white surface, rounded-2xl. */
export function Card({ children, className, as: Tag = "div" }: CardProps) {
  return (
    <Tag
      className={`rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${className ?? ""}`}
    >
      {children}
    </Tag>
  );
}
