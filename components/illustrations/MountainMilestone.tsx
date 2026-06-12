/**
 * Mountain with a summit flag for "Next milestone" cards. Peak uses currentColor
 * (set a text-* token on the parent); the flag uses the coral primary token.
 */
export function MountainMilestone({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Back ridge */}
      <path d="M0 110 L52 46 L96 110 Z" fill="currentColor" opacity="0.35" />
      {/* Main peak */}
      <path d="M44 110 L104 28 L160 110 Z" fill="currentColor" opacity="0.6" />
      {/* Snow cap */}
      <path d="M88 50 L104 28 L120 50 L110 46 L104 54 L98 46 Z" fill="var(--surface-raised)" opacity="0.9" />
      {/* Flag */}
      <line x1="104" y1="28" x2="104" y2="6" stroke="var(--ink-secondary)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M104 8 L122 13 L104 18 Z" fill="var(--primary)" />
      {/* Ground line */}
      <path d="M0 110 H160" stroke="var(--hairline-strong)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
