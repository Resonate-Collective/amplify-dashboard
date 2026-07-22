// Auth.js (NextAuth v5) — Google sign-in restricted to the resonate.net Workspace.
// The domain check runs server-side against the verified email, not the `hd` hint.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ALLOWED_DOMAIN } from "./config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // Railway terminates TLS and forwards the host header.
  secret: process.env.SESSION_SECRET ?? process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      authorization: {
        // `hd` is a hint only; the real gate is the signIn callback below.
        params: { hd: ALLOWED_DOMAIN, prompt: "select_account" },
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    error: "/denied", // AccessDenied (wrong domain) lands here
  },
  callbacks: {
    // Server-side gate: verified email that ends with @resonate.net, nothing else.
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase() ?? "";
      const verified = profile?.email_verified === true;
      return verified && email.endsWith(`@${ALLOWED_DOMAIN.toLowerCase()}`);
    },
  },
});
