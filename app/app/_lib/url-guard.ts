import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** True for addresses that must never be fetched on a visitor's behalf (private, loopback, link-local...). */
export function isPrivateAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return isPrivateAddress(mapped[1]);
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const v6 = address.toLowerCase();
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || /^fe[89ab]/.test(v6) || v6.startsWith("ff");
}

/** Normalise user input into a public http(s) URL, or return the reason it was refused. */
export async function checkPublicUrl(input: string): Promise<{ ok: true; url: URL } | { ok: false; error: string }> {
  const text = input.trim();
  if (!text) return { ok: false, error: "Enter a website address." };
  let url: URL;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`); } catch { return { ok: false, error: "That does not look like a valid web address." }; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, error: "Only http and https addresses can be audited." };
  if (url.username || url.password) return { ok: false, error: "Remove the username and password from the address." };
  if (url.port && url.port !== "80" && url.port !== "443") return { ok: false, error: "Only standard web ports can be audited." };
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host.includes(".") && !isIP(host)) return { ok: false, error: "Enter a full website address, such as example.com." };
  let addresses: string[];
  try { addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map(a => a.address); } catch { return { ok: false, error: "That website could not be found." }; }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) return { ok: false, error: "That address is not a public website." };
  return { ok: true, url };
}
