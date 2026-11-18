import { NextResponse } from "next/server";
import { SESSION_COOKIE, checkCredentials, createSession } from "@/_lib/gate";

export async function POST(request: Request) {
  const user = process.env.ADMIN_GATE_USER ?? "";
  const password = process.env.ADMIN_GATE_PASSWORD ?? "";
  if (!(user && password)) return NextResponse.json({ error: "Access is not configured." }, { status: 503 });

  let body: { username?: unknown; password?: unknown; remember?: unknown } = {};
  try { body = await request.json(); } catch { /* falls through to rejection */ }
  const username = typeof body.username === "string" ? body.username : "";
  const supplied = typeof body.password === "string" ? body.password : "";

  if (!checkCredentials(user, password, username, supplied)) {
    await new Promise(resolve => setTimeout(resolve, 600)); // slow down guessing
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const remember = body.remember === true;
  const seconds = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SESSION_COOKIE, await createSession(user, password, seconds), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
    ...(remember ? { maxAge: seconds } : {}),
  });
  return response;
}
