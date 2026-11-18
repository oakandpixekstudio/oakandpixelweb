import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./app/_lib/gate";

/**
 * Password gate for the whole workspace.
 *
 * Set ADMIN_GATE_USER and ADMIN_GATE_PASSWORD in the hosting environment
 * (Vercel > Project > Settings > Environment Variables). In production the
 * gate fails closed: if either value is missing, every request is refused.
 * In local development with no values set, the gate is open for convenience.
 *
 * Visitors without a valid session are sent to the styled /sign-in page.
 */
const PUBLIC_PATHS = ["/sign-in", "/api/login", "/api/logout"];
const PUBLIC_PREFIXES = ["/images/"];

const harden = (response: NextResponse) => {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
};

export async function proxy(request: NextRequest) {
  const user = process.env.ADMIN_GATE_USER ?? "";
  const password = process.env.ADMIN_GATE_PASSWORD ?? "";

  if (!(user && password)) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return harden(new NextResponse("Access is not configured.", { status: 503 }));
  }

  const { pathname } = request.nextUrl;
  const signedIn = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, user, password);

  if (pathname === "/sign-in" && signedIn) return harden(NextResponse.redirect(new URL("/overview", request.url)));
  if (signedIn || PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return harden(NextResponse.next());

  if (pathname.startsWith("/api/")) return harden(NextResponse.json({ error: "Authentication required." }, { status: 401 }));
  return harden(NextResponse.redirect(new URL("/sign-in", request.url)));
}

export const config = {
  // Protect everything. Skip only Next's own static bundles.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
