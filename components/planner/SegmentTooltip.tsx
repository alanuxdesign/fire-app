"use client";

import { useId, useRef, useState } from "react";

type SegmentTooltipProps = {
  label: string;
  content: React.ReactNode;
  children: React.ReactNode;
  /** Override default icon-button styling (e.g. invisible hit targets on bar ticks). */
  triggerClassName?: string;
  /** Override wrapper around trigger + tooltip. */
  className?: string;
};

export function SegmentTooltip({
  label,
  content,
  children,
  triggerClassName,
  className,
}: SegmentTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div className={className ?? "relative flex flex-col items-center"}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => setOpen((v) => !v)}
        className={
          triggerClassName ??
          "rounded-full p-1.5 text-ink-soft transition-colors hover:bg-sage-wash hover:text-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
        }
      >
        {children}
      </button>
      {open ? (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full z-30 mb-2 w-52 max-w-[min(16rem,calc(100vw-2rem))] rounded-[14px] border border-hairline bg-paper-2 px-3 py-2.5 text-left text-xs leading-relaxed text-ink-soft shadow-sm"
        >
          {content}
        </div>
      ) : null}
    </div>
  );
}
