import { SettingsClient } from "@/components/settings/SettingsClient";
import { auth, isDemoUser, signOut } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await auth();
  const isDemo = isDemoUser(session);

  if (isDemo) {
    return (
      <div className="flex flex-1 flex-col px-4 py-8 lg:mx-auto lg:w-full lg:max-w-3xl">
        <h1 className="text-2xl font-semibold text-ink">
          Settings
        </h1>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-2xl border border-loss/40 bg-surface px-4 py-3 text-sm font-medium text-loss transition-colors hover:bg-loss-soft"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return <SettingsClient />;
}
