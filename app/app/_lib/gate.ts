/**
 * Shared-password gate used by proxy.ts and the sign-in route.
 *
 * This is a stop-gap so the demo workspace is not open to the internet. It is
 * NOT user authentication: there are no individual accounts, roles or audit
 * trail. Replace it with real sign-in before any real client data is stored.
 *
 * A successful sign-in sets a signed, HttpOnly cookie (HMAC-SHA256 of the expiry,
 * keyed by the configured credentials). Changing the password signs everyone out.
 */

export const SESSION_COOKIE = "ops_session";

const encoder = new TextEncoder();

/** Constant-time string comparison (does not leak where the strings differ). */
export function safeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  const length = Math.max(x.length, y.length);
  for (let i = 0; i < length; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** True only when both supplied values equal the configured credentials. */
export function checkCredentials(user: string, password: string, suppliedUser: string, suppliedPassword: string): boolean {
  if (!user || !password) return false;
  // Evaluate both comparisons so timing does not reveal which one failed.
  const userOk = safeEqual(suppliedUser, user);
  const passwordOk = safeEqual(suppliedPassword, password);
  return userOk && passwordOk;
}

async function sign(value: string, user: string, password: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(`${user}\n${password}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

/** Create a session token that expires `seconds` from `now`. */
export async function createSession(user: string, password: string, seconds: number, now = Date.now()): Promise<string> {
  const expires = String(now + seconds * 1000);
  return `${expires}.${await sign(expires, user, password)}`;
}

/** True when the token was signed with the configured credentials and has not expired. */
export async function verifySession(token: string | undefined, user: string, password: string, now = Date.now()): Promise<boolean> {
  if (!token || !user || !password) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) < now) return false;
  return safeEqual(signature, await sign(expires, user, password));
}
