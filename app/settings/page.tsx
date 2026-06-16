import { SettingsClient } from "@/components/settings/SettingsClient";
import { auth, isDemoUser, signOut } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await auth();
  const isDemo = isDemoUser(session);

  if (isDemo) {
    return (
      <div className="flex flex-1 flex-col bg-paper px-5 py-8 lg:mx-auto lg:w-full lg:max-w-3xl lg:px-8">
        <h1 className="font-display text-[2rem] leading-tight tracking-[-0.015em] text-ink">
          Settings
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          You&apos;re exploring the demo garden. Sign in with your own account to
          start growing your real one.
        </p>
        <form
          className="mt-7 border-t border-hairline pt-6"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-full border border-hairline px-4 py-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-sage-wash"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return <SettingsClient />;
}
