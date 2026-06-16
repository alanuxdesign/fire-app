/**
 * HeroBand — a soft watercolor scene behind the hero number: layered hills, a
 * gentle low sun, grass tufts and leaf sprigs. All colors read from Ember
 * tokens so the band flips with the theme. Decorative only (aria-hidden);
 * motion is gated behind prefers-reduced-motion.
 *
 * Kept under the SunriseHero name for existing imports.
 */
export function SunriseHero({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        {/* Soft watercolor sun glow — no harsh disc, no rays */}
        <radialGradient id="ember-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ds-terra-soft)" stopOpacity="0.55" />
          <stop offset="55%" stopColor="var(--ds-clay)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--ds-clay)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ember-bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ds-sage-soft)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--ds-sage-soft)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Low sun, seated in the hills */}
      <circle cx="306" cy="150" r="92" fill="url(#ember-sun)" />
      <circle cx="306" cy="150" r="30" fill="var(--ds-terra-soft)" opacity="0.4" />
      <circle cx="90" cy="60" r="80" fill="url(#ember-bloom)" />

      {/* Layered watercolor hills */}
      <path d="M0 170 Q110 138 230 164 T400 154 V220 H0 Z" fill="var(--ds-sky-1)" opacity="0.7" />
      <path d="M0 188 Q140 160 280 184 T400 178 V220 H0 Z" fill="var(--ds-sage-soft)" opacity="0.4" />
      <path d="M0 206 Q120 188 260 204 T400 198 V220 H0 Z" fill="var(--ds-sage)" opacity="0.34" />

      {/* Grass tufts + leaf sprigs along the near hill */}
      <g stroke="var(--ds-sage)" strokeWidth="2" strokeLinecap="round" opacity="0.5">
        <path d="M44 206 q-3 -12 -8 -16" />
        <path d="M48 206 q1 -14 6 -19" />
        <path d="M52 206 q5 -10 12 -12" />
        <path d="M330 200 q-2 -12 -7 -16" />
        <path d="M335 200 q2 -13 8 -16" />
      </g>
      <g fill="var(--ds-sage)" opacity="0.45">
        <path d="M196 200 q-9 -3 -12 -11 q9 0 12 8Z" />
        <path d="M200 200 q9 -3 12 -11 q-9 0 -12 8Z" />
      </g>
    </svg>
  );
}
