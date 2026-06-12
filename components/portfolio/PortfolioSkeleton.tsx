import { PORTFOLIO_FLOATING_CARD } from "@/components/portfolio/portfolioStyles";

export function PortfolioSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col animate-pulse">
      <section className="shrink-0 bg-gradient-to-b from-(--hero-from) via-(--hero-via) to-(--hero-to) px-4 pb-16 pt-8">
        <div className="mx-auto h-3 w-24 rounded-full bg-ink/5" />
        <div className="mx-auto mt-5 h-14 w-52 rounded-xl bg-ink/5" />
        <div className="mx-auto mt-2 h-3 w-32 rounded-full bg-ink/5" />
        <div className="mx-1 mt-6 h-44 rounded-2xl bg-surface/60 ring-1 ring-hairline" />
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-7 w-10 rounded-full bg-ink/5" />
          ))}
        </div>
      </section>

      <div className="-mt-10 flex-1 space-y-4 bg-canvas p-4">
        <div className={`h-20 ${PORTFOLIO_FLOATING_CARD}`} />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className={`overflow-hidden ${PORTFOLIO_FLOATING_CARD}`}>
              <div className="px-4 py-4">
                <div className="h-4 w-28 rounded bg-hairline" />
                <div className="mt-3 h-8 w-36 rounded bg-hairline" />
              </div>
              {Array.from({ length: 2 }).map((__, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex items-center gap-3 px-4 py-4"
                >
                  <div className="h-10 w-10 rounded-2xl bg-hairline" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-hairline" />
                    <div className="h-3 w-20 rounded bg-hairline/70" />
                  </div>
                  <div className="h-6 w-20 rounded bg-hairline" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="h-12 rounded-2xl bg-hairline/80" />
      </div>
    </div>
  );
}
