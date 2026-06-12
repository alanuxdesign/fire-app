/**
 * Winding path with checkmark nodes for the "Your journey" motif.
 * done = gain, current = primary (pulses), future = hairline-strong.
 */
export function JourneyStepper({
  steps,
  currentIndex,
  className,
}: {
  steps: number;
  currentIndex: number;
  className?: string;
}) {
  const width = 320;
  const height = 72;
  const pad = 24;
  const gap = (width - pad * 2) / Math.max(1, steps - 1);
  const nodes = Array.from({ length: steps }).map((_, i) => ({
    x: pad + i * gap,
    y: height / 2 + (i % 2 === 0 ? -8 : 8),
  }));

  const linePath = nodes
    .map((n, i) => (i === 0 ? `M${n.x} ${n.y}` : `L${n.x} ${n.y}`))
    .join(" ");

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Journey progress: step ${currentIndex + 1} of ${steps}`}
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .journey-current { animation: journey-pulse 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        }
        @keyframes journey-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>

      <path d={linePath} stroke="var(--hairline-strong)" strokeWidth="3" strokeLinecap="round" />

      {nodes.map((n, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        const fill = done
          ? "var(--gain)"
          : current
            ? "var(--primary)"
            : "var(--surface-raised)";
        const ring = done || current ? fill : "var(--hairline-strong)";
        return (
          <g key={i} className={current ? "journey-current" : undefined}>
            <circle cx={n.x} cy={n.y} r="9" fill={fill} stroke={ring} strokeWidth="2" />
            {done ? (
              <path
                d={`M${n.x - 4} ${n.y} l3 3 l5 -6`}
                stroke="var(--on-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
