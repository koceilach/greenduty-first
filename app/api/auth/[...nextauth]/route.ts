import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// 1. هذا هو السطر السحري الذي سيمنع Next.js من تجميد الملف!
export const dynamic = "force-dynamic";

// 2. هذه رسالة ستظهر في سجلات Vercel لنعرف هل قرأ المتغير أم لا
console.log("Vercel Env Check - Google ID exists?:", !!process.env.GOOGLE_CLIENT_ID);

export const authOptions: NextAuthOptions = {
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
