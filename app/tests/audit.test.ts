import { describe, expect, it } from "vitest";
import { analyze, contrastRatio, lowContrast, parseColor } from "@/_lib/audit";
import { parseBrandReview } from "@/_lib/brand-review";
import { parsePageSpeed, plainAdvice } from "@/_lib/pagespeed";
import { isPrivateAddress } from "@/_lib/url-guard";

const NOW = new Date("2026-11-18T10:00:00Z");
const WORDS = Array.from({ length: 280 }, (_, i) => `We design and build fast, clear websites that win customers for small businesses number${i}.`).join(" ");
const CSS = `:root{--green:#1a5c3a;--ink:#111}body{font-family:"Inter",sans-serif;font-size:16px;line-height:1.6;color:#111;background:#fff;margin:0}
h1,h2{font-family:"Playfair Display",serif}.hero{display:flex;gap:24px;padding:48px}.btn{display:inline-block;padding:14px 22px;background:#1a5c3a;color:#fff;border-radius:8px;transition:transform .2s}
.btn:hover{transform:translateY(-2px)}@media (max-width:700px){.hero{display:block}}` + " .x{margin:0}".repeat(80);
const GOOD = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Oak and Pixel web design studio in South Africa</title>
<meta name="description" content="A web design studio building fast, clear, good looking websites for small businesses in South Africa."><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://example.com/"><link rel="icon" href="/f.ico"><meta property="og:title" content="x"><meta property="og:image" content="/i.png">
<style>${CSS}</style><script type="application/ld+json">{}</script></head>
<body><header><nav><a class="logo" href="/">Oak and Pixel</a><a href="/about">About us</a><a href="/work">Our work</a><a href="/contact">Contact us</a></nav></header>
<main><h1>Websites that win you more customers</h1><h2>Services</h2><p>${WORDS}</p><p>Trusted by clients across South Africa. Read our testimonials and reviews.</p>
<a class="btn" href="/quote">Get a quote</a> <a class="btn" href="https://wa.me/27820000000">Book a call</a><p>Call <a href="tel:+27820000000">082 000 0000</a> or email <a href="mailto:hello@example.co.za">hello@example.co.za</a></p>
<form><label for="e">Email</label><input id="e" type="email"><textarea aria-label="Message"></textarea><button>Send</button></form>
<img src="a.webp" alt="A" width="10" height="10"></main><footer><a href="/privacy">Privacy policy</a> <a href="https://instagram.com/x">Instagram</a> © 2026 Example</footer></body></html>`;
const GOOD_HEADERS = { "content-encoding": "br", "cache-control": "max-age=60", "strict-transport-security": "max-age=1", "content-security-policy": "default-src 'self'", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "no-referrer", "permissions-policy": "camera=()" };
const GOOD_EXTRAS = { httpRedirectsToHttps: true, robots: true, sitemap: true };

// An old-fashioned, table-based, non-responsive page on plain HTTP: the kind of site that looks dated and unfinished.
const TERRIBLE = `<html><head><title>Welcome</title></head><body bgcolor="#cccccc"><center><font color="red" size="6">Under construction</font></center>
<table width="100%"><tr><td><img src="a.gif"><img src="b.gif"></td></tr></table><table><tr><td align="left"><marquee>Click here</marquee></td></tr></table>
<table><tr><td><a href="x.html">click here</a></td></tr></table><script src="jquery-1.8.3.min.js"></script><script>document.write("hi")</script></body></html>`;

describe("website audit (quick check)", () => {
  it("scores a well-built, secure page highly with no high-priority findings", () => {
    const result = analyze({ url: "example.com", finalUrl: "https://example.com/", html: GOOD, headers: GOOD_HEADERS, responseMs: 120, extras: GOOD_EXTRAS, css: "" }, NOW);
    expect(result.overall).toBeGreaterThanOrEqual(88);
    expect(result.findings.filter(f => f.severity === "High")).toEqual([]);
    expect(Object.keys(result.scores)).toHaveLength(7);
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it("gives an old, insecure, unstyled page a poor score in every area", () => {
    const result = analyze({ url: "x.com", finalUrl: "http://x.com/", html: TERRIBLE, headers: {}, responseMs: 2500 }, NOW);
    expect(result.overall).toBeLessThan(30);
    for (const score of Object.values(result.scores)) expect(score).toBeLessThan(60);
    const messages = result.findings.map(f => f.message).join(" | ");
    expect(messages).toMatch(/HTTPS/);
    expect(messages).toMatch(/viewport/);
    expect(messages).toMatch(/outdated HTML/);
    expect(messages).toMatch(/placeholder/);
    expect(messages).toMatch(/almost no styling/);
    expect(messages).toMatch(/call to action/);
    expect(messages).toMatch(/contact details/);
    expect(result.findings[0].severity).toBe("High");
  });

  it("gives every finding a recommended action and a way to verify it", () => {
    const result = analyze({ url: "x.com", finalUrl: "http://x.com/", html: TERRIBLE, headers: {}, responseMs: 2500 }, NOW);
    for (const finding of result.findings) { expect(finding.fix, finding.message).toBeTruthy(); expect(finding.verify, finding.message).toBeTruthy(); }
  });

  it("does not reward a page for lacking images or forms", () => {
    const bare = analyze({ url: "x.com", finalUrl: "https://x.com/", html: "<!DOCTYPE html><html><body><p>hi</p></body></html>", headers: {}, responseMs: 100 }, NOW);
    expect(bare.overall).toBeLessThan(50);
  });

  it("flags an out-of-date copyright year", () => {
    const old = GOOD.replace("© 2026", "© 2019");
    const result = analyze({ url: "e.com", finalUrl: "https://e.com/", html: old, headers: GOOD_HEADERS, responseMs: 100, extras: GOOD_EXTRAS }, NOW);
    expect(result.findings.map(f => f.message).join(" ")).toMatch(/© 2019/);
  });
});

describe("colour contrast", () => {
  it("parses hex and rgb colours", () => {
    expect(parseColor("#fff")).toEqual([255, 255, 255]);
    expect(parseColor("#1a5c3a")).toEqual([26, 92, 58]);
    expect(parseColor("rgb(10, 20, 30)")).toEqual([10, 20, 30]);
    expect(parseColor("nonsense")).toBeNull();
  });
  it("computes WCAG contrast ratios", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 0);
    expect(contrastRatio([119, 119, 119], [255, 255, 255])).toBeGreaterThan(4.4);
  });
  it("finds low-contrast text and background pairs", () => {
    expect(lowContrast(".a{color:#ccc;background:#fff}.b{color:#111;background:#fff}", "")).toMatchObject({ pairs: 2, failing: 1 });
    expect(lowContrast("", '<p style="color:#eee;background-color:#fff">x</p>')).toMatchObject({ pairs: 1, failing: 1 });
  });
});

describe("PageSpeed parsing", () => {
  it("maps Lighthouse categories, failing audits, metrics and the screenshot", () => {
    const result = parsePageSpeed({
      lighthouseResult: {
        categories: {
          performance: { score: 0.42, auditRefs: [{ id: "lcp", weight: 25 }, { id: "ok", weight: 10 }] },
          seo: { score: 0.9, auditRefs: [] },
        },
        audits: {
          lcp: { id: "lcp", title: "Largest Contentful Paint", description: "LCP marks the render time of the largest content. [Learn more](https://web.dev/lcp).", score: 0.1, scoreDisplayMode: "numeric", displayValue: "6.2 s" },
          ok: { id: "ok", title: "Fine", score: 1, scoreDisplayMode: "binary", displayValue: "0.4 s" },
          "first-contentful-paint": { id: "first-contentful-paint", title: "FCP", score: 0.4, scoreDisplayMode: "numeric", displayValue: "3.1 s" },
          "final-screenshot": { id: "final-screenshot", title: "Screenshot", score: null, scoreDisplayMode: "informative", details: { data: "data:image/jpeg;base64,AAAA" } },
        },
      },
    });
    expect(result?.scores).toEqual({ Performance: 42, SEO: 90 });
    expect(result?.findings).toHaveLength(1);
    expect(result?.findings[0]).toMatchObject({ category: "Performance", severity: "High", message: "Largest Contentful Paint (6.2 s)", fix: "LCP marks the render time of the largest content." });
    expect(result?.metrics[0]).toEqual({ label: "First paint", value: "3.1 s", rating: "bad" });
    expect(result?.screenshot).toBe("data:image/jpeg;base64,AAAA");
    expect(result?.passed).toBe(1);
    expect(parsePageSpeed({})).toBeNull();
  });
  it("turns markdown advice into one plain sentence", () => {
    expect(plainAdvice("Serve images in next-gen formats. [Learn more](https://x.dev). Extra detail.")).toBe("Serve images in next-gen formats.");
    expect(plainAdvice(undefined)).toBeUndefined();
  });
});

describe("AI design review parsing", () => {
  const ratings = ["Visual design", "Typography", "Colour", "Imagery", "Layout and spacing", "Brand clarity"].map((label, i) => ({ label, score: 40 + i * 5 }));
  it("accepts well-formed JSON, even in a code fence", () => {
    const raw = "```json\n" + JSON.stringify({ summary: "Dated and cluttered.", strengths: ["Clear phone number"], ratings, issues: [{ severity: "High", observation: "Heading hierarchy is unclear.", recommendation: "Use one clear H1." }] }) + "\n```";
    const parsed = parseBrandReview(raw);
    expect(parsed?.score).toBe(53);
    expect(parsed?.findings[0]).toMatchObject({ category: "Brand & Design", severity: "High" });
    expect(parsed?.review.summary).toBe("Dated and cluttered.");
  });
  it("rejects malformed or out-of-range output instead of trusting it", () => {
    expect(parseBrandReview("not json")).toBeNull();
    expect(parseBrandReview(JSON.stringify({ ratings: [{ label: "Visual design", score: 500 }] }))).toBeNull();
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
