import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/utils/supabase/middleware";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function middleware(request: NextRequest) {
  // Never let an auth hiccup take down the whole request — fall through
  // with a clean response so pages keep serving even if the Supabase auth
  // endpoint is misconfigured (e.g. anonymous sign-ins not yet enabled).
  try {
    const { supabaseResponse, user } = await updateSession(request);
    if (user) return supabaseResponse;

    // Anonymous sign-ins must be enabled in the Supabase project (Auth →
    // Providers → Anonymous Sign-Ins). Until that's on, this call errors
    // and we just continue without a session; visit reads return {} and
    // the rest of the app works.
    const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn("[middleware] signInAnonymously failed:", error.message);
    }
    return supabaseResponse;
  } catch (err) {
    console.warn("[middleware] unhandled error, continuing:", err);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
