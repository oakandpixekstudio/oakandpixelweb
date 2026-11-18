import { describe, expect, it } from "vitest";
import { analyze } from "@/_lib/audit";
import { parsePageSpeed } from "@/_lib/pagespeed";
import { isPrivateAddress } from "@/_lib/url-guard";

const WORDS = Array.from({ length: 300 }, (_, i) => `word${i}`).join(" ");
const GOOD = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Oak and Pixel web design studio in South Africa</title>
<meta name="description" content="A web design studio building fast, clear, good looking websites for small businesses in South Africa."><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://example.com/"><link rel="icon" href="/f.ico"><link rel="stylesheet" href="/a.css"><meta property="og:title" content="x"><meta property="og:image" content="/i.png">
<style>@media (max-width:600px){body{margin:0}}</style><script type="application/ld+json">{}</script></head>
<body><header><nav><a href="/">Home</a><a href="/about">About</a><a href="/work">Work</a></nav></header><main><h1>Hello</h1><h2>Services</h2><p>${WORDS}</p><img src="a.webp" alt="A" width="10" height="10"></main><footer>x</footer></body></html>`;
const GOOD_HEADERS = { "content-encoding": "br", "cache-control": "max-age=60", "strict-transport-security": "max-age=1", "content-security-policy": "default-src 'self'", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "no-referrer", "permissions-policy": "camera=()" };
const GOOD_EXTRAS = { httpRedirectsToHttps: true, robots: true, sitemap: true };

// An old-fashioned, table-based, non-responsive page on plain HTTP.
const TERRIBLE = `<html><head><title>Welcome</title></head><body bgcolor="#cccccc"><center><font color="red" size="6">Under construction</font></center>
<table width="100%"><tr><td><img src="a.gif"><img src="b.gif"></td></tr></table><table><tr><td align="left"><marquee>Click here</marquee></td></tr></table>
<table><tr><td><a href="x.html">click here</a></td></tr></table><script src="jquery-1.8.3.min.js"></script><script>document.write("hi")</script></body></html>`;

describe("website audit (quick check)", () => {
  it("scores a well-built, secure page highly with no findings", () => {
    const result = analyze({ url: "example.com", finalUrl: "https://example.com/", html: GOOD, headers: GOOD_HEADERS, responseMs: 120, extras: GOOD_EXTRAS });
    expect(result.overall).toBeGreaterThanOrEqual(95);
    expect(result.findings).toEqual([]);
  });

  it("gives an old, insecure, non-responsive page a poor score", () => {
    const result = analyze({ url: "x.com", finalUrl: "http://x.com/", html: TERRIBLE, headers: {}, responseMs: 2500 });
    expect(result.overall).toBeLessThan(35);
    for (const score of Object.values(result.scores)) expect(score).toBeLessThan(60);
    const messages = result.findings.map(f => f.message).join(" | ");
    expect(messages).toMatch(/HTTPS/);
    expect(messages).toMatch(/viewport/);
    expect(messages).toMatch(/outdated HTML/);
    expect(messages).toMatch(/placeholder/);
    expect(result.findings[0].severity).toBe("High");
  });

  it("does not reward a page for lacking images or forms", () => {
    const bare = analyze({ url: "x.com", finalUrl: "https://x.com/", html: "<!DOCTYPE html><html><body><p>hi</p></body></html>", headers: {}, responseMs: 100 });
    expect(bare.overall).toBeLessThan(55);
  });
});

describe("PageSpeed parsing", () => {
  it("maps Lighthouse categories, failing audits and metrics", () => {
    const result = parsePageSpeed({
      lighthouseResult: {
        categories: {
          performance: { score: 0.42, auditRefs: [{ id: "lcp", weight: 25 }, { id: "ok", weight: 10 }] },
          seo: { score: 0.9, auditRefs: [] },
        },
        audits: {
          lcp: { id: "lcp", title: "Largest Contentful Paint", score: 0.1, scoreDisplayMode: "numeric", displayValue: "6.2 s" },
          ok: { id: "ok", title: "Fine", score: 1, scoreDisplayMode: "binary" },
          "first-contentful-paint": { id: "first-contentful-paint", title: "FCP", score: 0.4, scoreDisplayMode: "numeric", displayValue: "3.1 s" },
        },
      },
    });
    expect(result?.scores).toEqual({ Performance: 42, SEO: 90 });
    expect(result?.findings).toEqual([{ category: "Performance", severity: "High", message: "Largest Contentful Paint (6.2 s)" }]);
    expect(result?.metrics[0]).toEqual({ label: "First paint", value: "3.1 s", rating: "bad" });
    expect(result?.passed).toBe(1);
    expect(parsePageSpeed({})).toBeNull();
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
