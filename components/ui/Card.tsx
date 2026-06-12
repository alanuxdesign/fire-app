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
      className={`rounded-2xl border border-hairline bg-surface p-4 ${className ?? ""}`}
    >
      {children}
    </Tag>
  );
}
