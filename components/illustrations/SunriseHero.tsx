/**
 * Full-bleed sunrise scene that sits behind the net-worth number in the hero.
 * Themeable: sun/rays/hills read from design tokens, so it flips with the theme.
 * Decorative only (aria-hidden); animation is gated behind prefers-reduced-motion.
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
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .sun-rays { transform-box: fill-box; transform-origin: center; animation: sun-spin 60s linear infinite; }
        }
        @keyframes sun-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Sun */}
      <circle cx="300" cy="150" r="46" fill="var(--primary)" opacity="0.85" />
      <g className="sun-rays" stroke="var(--accent-gold)" strokeWidth="3" strokeLinecap="round" opacity="0.7">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 300 + Math.cos(angle) * 58;
          const y1 = 150 + Math.sin(angle) * 58;
          const x2 = 300 + Math.cos(angle) * 72;
          const y2 = 150 + Math.sin(angle) * 72;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>

      {/* Hill bands */}
      <path d="M0 168 Q120 132 240 162 T400 150 V220 H0 Z" fill="var(--accent-peach)" opacity="0.25" />
      <path d="M0 188 Q140 158 280 184 T400 176 V220 H0 Z" fill="var(--accent-purple)" opacity="0.2" />
      <path d="M0 204 Q120 184 260 202 T400 196 V220 H0 Z" fill="var(--accent-green)" opacity="0.22" />
    </svg>
  );
}
