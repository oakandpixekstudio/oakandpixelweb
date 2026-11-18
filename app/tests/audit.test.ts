import { describe, expect, it } from "vitest";
import { analyze } from "@/_lib/audit";
import { isPrivateAddress } from "@/_lib/url-guard";

const GOOD = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Oak and Pixel web design studio</title>
<meta name="description" content="A web design studio building fast, clear websites for small businesses in South Africa."><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://example.com/"><link rel="icon" href="/f.ico"><meta property="og:title" content="x"><meta property="og:image" content="/i.png">
<script type="application/ld+json">{}</script></head><body><main><h1>Hello</h1><img src="a.png" alt="A" width="10" height="10"></main></body></html>`;
const GOOD_HEADERS = { "content-encoding": "br", "cache-control": "max-age=60", "strict-transport-security": "max-age=1", "content-security-policy": "default-src 'self'", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "no-referrer", "permissions-policy": "camera=()" };

describe("website audit", () => {
  it("scores a well-built page highly with no findings", () => {
    const result = analyze({ url: "example.com", finalUrl: "https://example.com/", html: GOOD, headers: GOOD_HEADERS, responseMs: 120 });
    expect(result.overall).toBeGreaterThanOrEqual(95);
    expect(result.findings).toEqual([]);
  });

  it("flags a bare, insecure page", () => {
    const result = analyze({ url: "x.com", finalUrl: "http://x.com/", html: "<html><body><img src='a.png'><h1>a</h1><h1>b</h1></body></html>", headers: {}, responseMs: 2500 });
    expect(result.overall).toBeLessThan(55);
    const messages = result.findings.map(f => f.message).join(" | ");
    expect(messages).toMatch(/not served over HTTPS/);
    expect(messages).toMatch(/no title/);
    expect(messages).toMatch(/alt text/);
    expect(result.findings[0].severity).toBe("High");
  });
});

describe("url guard", () => {
  it("blocks private, loopback and link-local addresses", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) expect(isPrivateAddress(ip), ip).toBe(true);
  });
  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });
});
