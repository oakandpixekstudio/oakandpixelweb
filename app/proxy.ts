import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkBasicAuth } from "./app/_lib/gate";

/**
 * Password gate for the whole workspace.
 *
 * Set ADMIN_GATE_USER and ADMIN_GATE_PASSWORD in the hosting environment
 * (Vercel > Project > Settings > Environment Variables). In production the
 * gate fails closed: if either value is missing, every request is refused.
 * In local development with no values set, the gate is open for convenience.
 */
export function proxy(request: NextRequest) {
  const user = process.env.ADMIN_GATE_USER ?? "";
  const password = process.env.ADMIN_GATE_PASSWORD ?? "";
  const configured = Boolean(user && password);

  if (!configured) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("Access is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  if (checkBasicAuth(request.headers.get("authorization"), user, password)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Oak & Pixel Workspace", charset="UTF-8"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export const config = {
  // Protect everything, including /public assets. Skip only Next's own static bundles.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
