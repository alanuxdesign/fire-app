import Link from "next/link";

export function DemoBanner() {
  return (
    <div className="border-b border-amber-900/40 bg-amber-950/80 px-4 py-2.5 text-center text-xs text-amber-100/90">
      You&apos;re viewing a demo account.{" "}
      <Link
        href="/login"
        className="font-medium text-amber-200 underline underline-offset-2 hover:text-amber-50"
      >
        Sign in
      </Link>{" "}
      to connect your own accounts.
    </div>
  );
}
