import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

// Next.js 16: the file convention is `proxy.ts`, not `middleware.ts`.
// Keep this thin — proxy is not for slow data fetching. We only refresh
// the Supabase session token here so server reads see a valid auth state.
// Anonymous user creation happens lazily on the first write (see
// setVisitsForGym), so bots that never interact don't pollute auth.users.
export async function proxy(request: NextRequest) {
  try {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  } catch (err) {
    console.warn("[proxy] session refresh failed, continuing:", err);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
