"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { Moon, Sun } from "lucide-react";
import { signOut } from "next-auth/react";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-zinc-100">
        Settings
      </h1>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="font-medium text-slate-900 dark:text-zinc-100">
              Dark mode
            </p>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              {theme === "dark" ? "On" : "Off"}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => signOut({ redirectTo: "/login" })}
          className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
