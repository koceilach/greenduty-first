import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    const normalized = raw.trim().replace(/^['"]|['"]$/g, "");
    if (normalized) return normalized;
  }
  return "";
}

const googleClientId = readEnv(
  "GOOGLE_CLIENT_ID",
  "AUTH_GOOGLE_ID",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID"
);
const googleClientSecret = readEnv(
  "GOOGLE_CLIENT_SECRET",
  "AUTH_GOOGLE_SECRET",
  "NEXT_PUBLIC_GOOGLE_CLIENT_SECRET"
);
const nextAuthSecret = readEnv("NEXTAUTH_SECRET", "AUTH_SECRET");

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  secret: nextAuthSecret,
};
