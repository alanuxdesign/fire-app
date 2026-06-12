/**
 * Line-art empty-state spots. Each is labelled for screen readers and uses
 * coral primary + one pastel accent so they sit calmly above a heading.
 */

export function EmptyAccounts({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="No accounts linked yet"
    >
      <rect x="20" y="34" width="80" height="52" rx="12" fill="var(--accent-blue-soft)" />
      <rect x="20" y="34" width="80" height="52" rx="12" stroke="var(--accent-blue)" strokeWidth="2.5" />
      <path d="M20 50 H100" stroke="var(--accent-blue)" strokeWidth="2.5" />
      <circle cx="60" cy="22" r="12" fill="var(--primary)" opacity="0.9" />
      <path d="M55 22 h10 M60 17 v10" stroke="var(--on-primary)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyBudget({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="No budget set up yet"
    >
      <circle cx="60" cy="54" r="34" fill="var(--accent-green-soft)" />
      <path d="M60 54 L60 24 A30 30 0 0 1 86 60 Z" fill="var(--accent-green)" opacity="0.8" />
      <circle cx="60" cy="54" r="34" stroke="var(--accent-green)" strokeWidth="2.5" />
      <circle cx="60" cy="54" r="10" fill="var(--surface-raised)" />
    </svg>
  );
}

export function EmptyTransactions({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="No transactions yet"
    >
      <rect x="24" y="24" width="72" height="56" rx="10" fill="var(--accent-purple-soft)" />
      <rect x="24" y="24" width="72" height="56" rx="10" stroke="var(--accent-purple)" strokeWidth="2.5" />
      <path d="M36 42 H72" stroke="var(--accent-purple)" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 54 H84" stroke="var(--ink-muted)" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 66 H64" stroke="var(--ink-muted)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="86" cy="70" r="14" fill="var(--primary)" />
      <path d="M86 64 v12 M80 70 h12" stroke="var(--on-primary)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
