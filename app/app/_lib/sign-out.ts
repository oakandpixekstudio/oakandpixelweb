/** End the session cookie, then return to the sign-in page. */
export async function signOut(): Promise<void> {
  try { await fetch("/api/logout", { method: "POST" }); } catch { /* the sign-in page still loads */ }
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the cleared cookie takes effect
  window.location.href = "/sign-in";
}
