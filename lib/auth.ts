import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/drizzle/schema";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "@/lib/auth.config";
import { DEMO_EMAIL } from "@/lib/demo";
import { db } from "@/lib/db";

/**
 * Do not remove. Google OAuth + demo Credentials share demo@fireapp.com;
 * Auth.js requires this on the Google provider (see providers below).
 */
export const allowDangerousEmailAccountLinking = true as const;

export function isDemoUser(session: Session | null | undefined): boolean {
  return session?.user?.email?.toLowerCase() === DEMO_EMAIL;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking,
    }),
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        if (email !== DEMO_EMAIL) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, DEMO_EMAIL),
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    ...authConfig.callbacks,
  },
});
