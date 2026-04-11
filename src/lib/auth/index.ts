import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { profiles } from "@/lib/db/schema";
import { verifyPassword } from "./helpers";
import { authConfig } from "./config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials.email as string | undefined;
        const password = credentials.password as string | undefined;

        if (!email || !password) return null;

        const normalizedEmail = email.toLowerCase().trim();

        const user = await db.query.users.findFirst({
          where: eq(users.email, normalizedEmail),
        });

        if (!user?.password) return null;

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;

        const profile = await db.query.profiles.findFirst({
          where: eq(profiles.userId, user.id),
        });

        token.role = profile?.role;
        token.profileId = profile?.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.profileId = token.profileId;
      }
      return session;
    },
  },
});
