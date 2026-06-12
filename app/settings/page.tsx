import { SettingsClient } from "@/components/settings/SettingsClient";
import { auth, isDemoUser, signOut } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await auth();
  const isDemo = isDemoUser(session);

  if (isDemo) {
    return (
      <div className="flex flex-1 flex-col px-4 py-8 lg:mx-auto lg:w-full lg:max-w-3xl">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-zinc-100">
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
            className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return <SettingsClient />;
}
