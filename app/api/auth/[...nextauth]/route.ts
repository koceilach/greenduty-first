import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const googleClientId = process.env.GOOGLE_CLIENT_ID as string;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET as string;
const nextAuthSecret = process.env.NEXTAUTH_SECRET as string;

console.log("[Auth] Env check", {
  hasGoogleClientId: Boolean(googleClientId),
  hasGoogleClientSecret: Boolean(googleClientSecret),
  hasNextAuthSecret: Boolean(nextAuthSecret),
});

if (!googleClientId || !googleClientSecret) {
  throw new Error(
    "Missing Google OAuth env vars in runtime. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel Production, then redeploy."
  );
}

if (!nextAuthSecret) {
  throw new Error(
    "Missing NEXTAUTH_SECRET in runtime. Set it in Vercel Production, then redeploy."
  );
}

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET as string,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
