/**
 * Sprig (§4) — a faint botanical sprig decorating green cards, placed
 * bottom-right and bleeding off-edge. Uses a near-white token tint so it reads
 * only as texture on the deep-green band.
 */
export function Sprig({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <g stroke="rgba(255,255,255,0.13)" strokeWidth="2" strokeLinecap="round">
        <path d="M104 118 C96 92 92 66 96 36" />
        <path d="M96 56 C84 52 75 56 70 66" fill="none" />
        <path d="M96 72 C108 70 116 76 118 88" fill="none" />
        <path d="M97 40 C86 34 80 36 75 45" fill="none" />
        <path d="M96 44 C106 38 113 40 116 50" fill="none" />
      </g>
      <g fill="rgba(255,255,255,0.10)">
        <path d="M70 66 C75 56 84 52 96 56 C90 66 80 69 70 66Z" />
        <path d="M96 72 C108 70 116 76 118 88 C108 88 100 82 96 72Z" />
        <path d="M75 45 C80 36 86 34 97 40 C91 48 82 49 75 45Z" />
      </g>
    </svg>
  );
}
