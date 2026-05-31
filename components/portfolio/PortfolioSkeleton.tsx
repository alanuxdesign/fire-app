export function PortfolioSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col animate-pulse">
      <section className="shrink-0 bg-zinc-950 px-4 pb-4 pt-6">
        <div className="mx-auto h-3 w-20 rounded bg-zinc-800" />
        <div className="mx-auto mt-3 h-10 w-48 rounded bg-zinc-800" />
        <div className="mx-auto mt-2 h-4 w-16 rounded bg-zinc-800" />
        <div className="mt-8 h-40 rounded-lg bg-zinc-900" />
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-6 w-10 rounded-full bg-zinc-800" />
          ))}
        </div>
      </section>

      <div className="flex-1 space-y-4 bg-stone-100 p-4 dark:bg-zinc-950">
        <div className="h-16 rounded-xl bg-stone-200/80 dark:bg-zinc-900" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="border-b border-stone-100 px-4 py-4 dark:border-zinc-800">
                <div className="h-5 w-28 rounded bg-stone-200 dark:bg-zinc-800" />
                <div className="mt-2 h-4 w-40 rounded bg-stone-100 dark:bg-zinc-800/80" />
              </div>
              {Array.from({ length: 2 }).map((__, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex items-center gap-3 border-t border-stone-100 px-4 py-4 dark:border-zinc-800"
                >
                  <div className="h-10 w-10 rounded-full bg-stone-200 dark:bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-stone-200 dark:bg-zinc-800" />
                    <div className="h-3 w-20 rounded bg-stone-100 dark:bg-zinc-800/80" />
                  </div>
                  <div className="h-5 w-20 rounded bg-stone-200 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="h-12 rounded-xl bg-stone-200/80 dark:bg-zinc-900" />
      </div>
    </div>
  );
}
