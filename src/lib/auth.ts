import type { DefaultSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { normalizeUsername } from "@/lib/account-utils";
import { findUserByUsername, touchUserLastSeen } from "@/lib/user-database";

type AuthUser = DefaultSession["user"] & {
  id: string;
  username: string;
};

const sessionTokenName =
  process.env.NODE_ENV === "production"
    ? "__Secure-intellect-arena.session-token.v1"
    : "intellect-arena.session-token.v1";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: sessionTokenName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: {
          label: "Username",
          type: "text",
          placeholder: "your_handle",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const username = normalizeUsername(credentials?.username ?? "");
        const password = credentials?.password ?? "";

        if (!username || !password) {
          return null;
        }

        const user = findUserByUsername(username);

        if (!user) {
          return null;
        }

        const isValidPassword = await compare(password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        touchUserLastSeen(user.id);

        const authUser: AuthUser = {
          id: user.id,
          username: user.username,
          name: user.displayName,
          email: user.email,
          image: user.image,
        };

        return authUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.username = (user as AuthUser).username;
        token.name = user.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.username =
          typeof token.username === "string" ? token.username : "";
      }

      return session;
    },
  },
};
