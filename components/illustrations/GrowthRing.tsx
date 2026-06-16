/**
 * GrowthRing (§5) — circular progress for the single headline metric
 * ("Freedom progress"). Sage stroke (6px) on a --ds-line track, with a leaf
 * glyph centered. All color comes from tokens.
 */

export function GrowthRing({
  pct,
  size = 132,
  className,
  label,
  children,
}: {
  pct: number;
  size?: number;
  className?: string;
  label?: string;
  /** Optional center content (e.g. a Newsreader figure). Defaults to a leaf. */
  children?: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  const center = size / 2;

  return (
    <div
      className={`relative inline-grid place-items-center ${className ?? ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(clamped)} percent toward freedom`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--ds-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--ds-sage)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700 motion-safe:ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {children ?? (
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            aria-hidden
          >
            <path
              d="M12 21 V12 C12 7 8.5 4 4 3.5 c.4 5 3.6 8.4 8 9"
              stroke="var(--ds-sage)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 14 C12 10 15 7.5 19 7 c-.3 4 -3 6.6 -7 7"
              fill="var(--ds-sage-soft)"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
