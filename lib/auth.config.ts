import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no DB adapter). Used by middleware and extended in lib/auth.ts.
 */
export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      if (
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/cron")
      ) {
        return true;
      }

      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      if (user?.email) {
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      if (session.user && typeof token.email === "string") {
        session.user.email = token.email;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
