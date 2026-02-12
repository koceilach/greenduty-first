import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const GD_System_supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const GD_System_supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (!GD_System_supabaseUrl || !GD_System_supabaseKey) {
    return response;
  }

  const supabase = createServerClient(GD_System_supabaseUrl, GD_System_supabaseKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && pathname.startsWith("/reported-area")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  /* ── Education / Messages / Profile route protection ────────────────────── */
  const isEduRoute =
    pathname.startsWith("/education") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/profile");

  const isPublicEduRoute =
    pathname === "/education/login" || pathname === "/education/register";

  if (!user && isEduRoute && !isPublicEduRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/education/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/reported-area/:path*",
    "/education/:path*",
    "/messages/:path*",
    "/profile/:path*",
  ],
};
