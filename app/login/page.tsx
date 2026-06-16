import { signIn } from "@/lib/auth";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "Sign-in is not configured correctly. Check server environment variables.",
  AccessDenied: "Access was denied. You may have cancelled sign-in.",
  Verification: "The sign-in link expired or was already used.",
  OAuthSignin: "Could not start Google sign-in. Try again.",
  OAuthCallback: "Google sign-in failed during callback. Check redirect URIs.",
  OAuthAccountNotLinked:
    "This email is already linked to another sign-in method. Try the other option.",
  Default: "Sign-in failed. Please try again.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = error
    ? (AUTH_ERROR_MESSAGES[error] ?? AUTH_ERROR_MESSAGES.Default)
    : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm rounded-[22px] bg-surface-raised p-8 shadow-card ring-1 ring-hairline">
        <h1 className="text-center font-display text-[2rem] leading-tight tracking-[-0.015em] text-ink">
          Welcome to Fire
        </h1>
        <p className="mx-auto mt-2 max-w-[18rem] text-center text-sm leading-relaxed text-ink-soft">
          A gentle place to watch your savings take root and grow.
        </p>
        {errorMessage ? (
          <p
            className="mt-4 rounded-[14px] bg-[color:var(--ds-sand)] px-3 py-2 text-center text-sm text-ink"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/portfolio" });
          }}
        >
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-hairline bg-paper-2 px-4 text-sm font-semibold text-ink transition-colors hover:bg-sage-wash"
          >
            <GoogleIcon />
            Sign in with Google
          </button>
        </form>
        <form action="/api/auth/demo" method="POST" className="mt-3">
          <button
            type="submit"
            className="flex h-10 w-full items-center justify-center rounded-full px-4 text-xs font-semibold text-ink-soft transition-colors hover:text-terra"
          >
            Take a look around first
          </button>
        </form>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
