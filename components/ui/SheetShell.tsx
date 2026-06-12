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
  backdropClassName = "bg-canvas",
}: SheetShellProps) {
  return (
    <div
      className={`fixed inset-0 ${zIndexClassName} flex flex-col ${backdropClassName} lg:items-center lg:justify-center lg:bg-black/50 lg:dark:bg-black/60`}
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-y-auto px-4 py-4 lg:max-h-[85dvh] lg:flex-none lg:rounded-2xl lg:bg-canvas lg:px-6 lg:py-6 lg:shadow-float lg:ring-1 lg:ring-hairline">
        {children}
      </div>
    </div>
  );
}
