/**
 * Small person-celebrating spot for milestone-hit / win states.
 * Confetti + figure use accent tokens; decorative (aria-hidden).
 */
export function CelebrateSpot({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Confetti */}
      <circle cx="24" cy="30" r="4" fill="var(--accent-gold)" />
      <circle cx="98" cy="40" r="4" fill="var(--accent-blue)" />
      <rect x="80" y="18" width="7" height="7" rx="2" fill="var(--accent-purple)" transform="rotate(20 83 21)" />
      <rect x="30" y="14" width="7" height="7" rx="2" fill="var(--accent-green)" transform="rotate(-15 33 17)" />
      <circle cx="60" cy="12" r="3.5" fill="var(--primary)" />

      {/* Figure */}
      <circle cx="60" cy="52" r="12" fill="var(--accent-gold)" />
      <path d="M48 96 Q48 70 60 70 Q72 70 72 96 Z" fill="var(--primary)" />
      {/* Raised arms */}
      <path d="M50 74 L36 58" stroke="var(--accent-gold)" strokeWidth="5" strokeLinecap="round" />
      <path d="M70 74 L84 58" stroke="var(--accent-gold)" strokeWidth="5" strokeLinecap="round" />

      {/* Ground */}
      <path d="M30 104 H90" stroke="var(--hairline-strong)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
