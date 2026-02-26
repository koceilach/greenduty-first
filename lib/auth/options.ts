import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Force Vercel rebuild to inject Google env variables
const googleClientId = (process.env.GOOGLE_CLIENT_ID as string) || "";
const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET as string) || "";
const nextAuthSecret = (process.env.NEXTAUTH_SECRET as string) || "";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  secret: nextAuthSecret,
};
