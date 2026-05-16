import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /contests, /leaderboard, /profile are now publicly browseable. Auth is
// only required to actually do something (submit picks), and those server
// actions enforce auth themselves. /onboarding remains gated because it's
// the post-sign-in setup flow.
const PROTECTED_PREFIXES = ["/onboarding"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const requiresAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (requiresAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Onboarded gate. Source of truth is Supabase user_metadata.onboarded so
  // we don't need a DB query in the proxy. completeOnboarding sets this flag
  // alongside the DB write.
  const onboarded = user?.user_metadata?.onboarded === true;

  if (user && !onboarded && pathname !== "/onboarding" && requiresAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && onboarded && pathname === "/onboarding") {
    const url = request.nextUrl.clone();
    url.pathname = "/contest";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = onboarded ? "/contest" : "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
