/**
 * SproutVessel — the signature growth motif (§5). Progress is alive: a vessel
 * that grows from ember to plant. Pair `stage` with goal completion
 * (0% → ember, 100% → in leaf). Sits in a --ds-sage-wash rounded tile.
 *
 *   0 · Ember     — "just begun"   (a terracotta flame in the pot)
 *   1 · Sprout    — "taking root"
 *   2 · Seedling  — "growing"
 *   3 · In leaf   — "thriving"     (adds a terracotta bloom)
 *
 * All color comes from tokens; never hard-code hex here.
 */

export type SproutStage = 0 | 1 | 2 | 3;

const STAGE_LABEL: Record<SproutStage, string> = {
  0: "Just begun",
  1: "Taking root",
  2: "Growing",
  3: "Thriving",
};

/** Map a 0–100% completion to a vessel stage. */
export function stageForPct(pct: number): SproutStage {
  if (pct >= 100) return 3;
  if (pct >= 60) return 2;
  if (pct >= 20) return 1;
  return 0;
}

export function SproutVessel({
  stage = 0,
  className,
  tile = true,
}: {
  stage?: SproutStage;
  className?: string;
  /** Render inside the sage-wash rounded tile (default) or bare. */
  tile?: boolean;
}) {
  const art = (
    <svg
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Growth: ${STAGE_LABEL[stage]}`}
      className={tile ? "h-7 w-7" : className}
    >
      {/* Pot — warm clay */}
      <path
        d="M18 38 h20 l-2.4 11.5 a3 3 0 0 1 -3 2.5 h-9.2 a3 3 0 0 1 -3 -2.5 Z"
        fill="var(--ds-clay)"
      />
      <rect x="16.5" y="34.5" width="23" height="4.5" rx="2.25" fill="var(--ds-clay)" />

      {stage === 0 ? (
        /* Ember — a terracotta flame in the pot */
        <path
          d="M28 18 c4 4 6 7 6 11 a6 6 0 0 1 -12 0 c0 -3 2 -5 3.2 -7 c.6 2 1.6 2.6 2.8 3 c-.6 -3 -1.6 -4.8 0 -7Z"
          fill="var(--ds-terra)"
        />
      ) : null}

      {stage >= 1 ? (
        /* Stem — grows taller with each stage */
        <path
          d={
            stage === 1
              ? "M28 34 v-7"
              : stage === 2
                ? "M28 34 v-13"
                : "M28 34 v-17"
          }
          stroke="var(--ds-sage)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      ) : null}

      {stage === 1 ? (
        /* Sprout — two small leaves */
        <>
          <path d="M28 28 c-4 -1 -6 -3 -6.5 -6 c3 .2 5.5 1.6 6.5 5.4Z" fill="var(--ds-sage)" />
          <path d="M28 30 c4 -1 6 -3 6.5 -6 c-3 .2 -5.5 1.6 -6.5 5.4Z" fill="var(--ds-sage-soft)" />
        </>
      ) : null}

      {stage === 2 ? (
        /* Seedling — fuller pair of leaves */
        <>
          <path d="M28 24 c-5.5 -1 -8.5 -3.6 -9.2 -8 c4.2 .3 7.6 2.2 9.2 7Z" fill="var(--ds-sage)" />
          <path d="M28 27 c5.5 -1 8.5 -3.6 9.2 -8 c-4.2 .3 -7.6 2.2 -9.2 7Z" fill="var(--ds-sage-soft)" />
          <path d="M28 30 c-3.6 -.7 -5.6 -2.4 -6 -5.4 c2.8 .2 5 1.5 6 4.6Z" fill="var(--ds-sage)" />
        </>
      ) : null}

      {stage === 3 ? (
        /* In leaf — full canopy + a terracotta bloom */
        <>
          <path d="M28 20 c-6.5 -1.2 -10 -4.2 -10.8 -9.4 c5 .4 9 2.6 10.8 8.2Z" fill="var(--ds-sage)" />
          <path d="M28 23 c6.5 -1.2 10 -4.2 10.8 -9.4 c-5 .4 -9 2.6 -10.8 8.2Z" fill="var(--ds-sage-soft)" />
          <path d="M28 27 c-4.4 -.9 -6.8 -3 -7.4 -6.6 c3.4 .3 6.1 1.8 7.4 5.6Z" fill="var(--ds-sage)" />
          <circle cx="28" cy="13.5" r="3.6" fill="var(--ds-terra)" />
          <circle cx="28" cy="13.5" r="1.4" fill="var(--ds-terra-soft)" />
        </>
      ) : null}
    </svg>
  );

  if (!tile) return art;

  return (
    <span
      className={`inline-flex items-center justify-center bg-sage-wash ${className ?? "h-11 w-11"}`}
      style={{ borderRadius: "var(--ds-radius-tile)" }}
    >
      {art}
    </span>
  );
}
