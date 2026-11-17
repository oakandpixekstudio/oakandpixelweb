/**
 * Shared-password gate (HTTP Basic auth) used by proxy.ts.
 *
 * This is a stop-gap so the demo workspace is not open to the internet. It is
 * NOT user authentication: there are no individual accounts, roles or audit
 * trail. Replace it with real sign-in before any real client data is stored.
 */

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

/** Parse an `Authorization: Basic ...` header into user and password. */
export function parseBasicAuth(header: string | null): { user: string; password: string } | null {
  if (!header) return null;
  const match = /^Basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(header);
  if (!match) return null;
  let decoded: string;
  try {
    const binary = atob(match[1]);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    decoded = new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return null;
  return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

/** True only when the header carries exactly the configured credentials. */
export function checkBasicAuth(header: string | null, user: string, password: string): boolean {
  const supplied = parseBasicAuth(header);
  if (!supplied || !user || !password) return false;
  // Evaluate both comparisons so timing does not reveal which one failed.
  const userOk = safeEqual(supplied.user, user);
  const passwordOk = safeEqual(supplied.password, password);
  return userOk && passwordOk;
}
