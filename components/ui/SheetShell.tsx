import type { ReactNode } from "react";

type SheetShellProps = {
  children: ReactNode;
  /** Overlay z-index utility, e.g. "z-[60]". */
  zIndexClassName?: string;
  /** Mobile full-screen backdrop classes. */
  backdropClassName?: string;
};

/**
 * Shared sheet container: full-screen takeover on mobile, centered dialog
 * over a scrim at lg+. Content scrolls internally in both modes.
 */
export function SheetShell({
  children,
  zIndexClassName = "z-[60]",
  backdropClassName = "bg-stone-100 dark:bg-zinc-950",
}: SheetShellProps) {
  return (
    <div
      className={`fixed inset-0 ${zIndexClassName} flex flex-col ${backdropClassName} lg:items-center lg:justify-center lg:bg-black/50 lg:dark:bg-black/60`}
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-y-auto px-4 py-4 lg:max-h-[85dvh] lg:flex-none lg:rounded-2xl lg:bg-stone-100 lg:px-6 lg:py-6 lg:shadow-xl lg:ring-1 lg:ring-black/5 lg:dark:bg-zinc-950 lg:dark:ring-white/10">
        {children}
      </div>
    </div>
  );
}
