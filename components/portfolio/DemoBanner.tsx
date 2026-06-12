import Link from "next/link";

export function DemoBanner() {
  return (
    <div className="shrink-0 border-b border-warn/30 bg-warn-soft px-4 py-2.5 text-center text-xs text-warn">
      You&apos;re viewing a demo account.{" "}
      <Link
        href="/login"
        className="font-semibold text-warn underline underline-offset-2 hover:opacity-80"
      >
        Sign in
      </Link>{" "}
      to connect your own accounts.
    </div>
  );
}
