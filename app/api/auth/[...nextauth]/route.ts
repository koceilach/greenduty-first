import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
export const dynamic = "force-dynamic";

export const authOptions: NextAuthOptions = {
providers: [
GoogleProvider({
clientId: process.env.GOOGLE_CLIENT_ID as string,
clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
}),
],
secret: process.env.NEXTAUTH_SECRET as string,
debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
