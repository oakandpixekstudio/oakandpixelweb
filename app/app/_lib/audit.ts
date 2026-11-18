/**
 * Website audit: scores a fetched page on five areas from what can be checked
 * without a browser (HTML, response headers, response time). It is a fast
 * health check, not a Lighthouse run: it cannot measure rendering or core web vitals.
 */

export type Severity = "High" | "Medium" | "Low";
export type AuditCategory = "Performance" | "SEO" | "Security" | "Accessibility" | "Best Practices";
export const CATEGORIES: AuditCategory[] = ["Performance", "SEO", "Security", "Accessibility", "Best Practices"];

export type AuditFinding = { category: AuditCategory; severity: Severity; message: string };
export type AuditResult = {
  url: string;
  finalUrl: string;
  auditedAt: string;
  overall: number;
  scores: Record<AuditCategory, number>;
  findings: AuditFinding[];
  passed: number;
  total: number;
  responseMs: number;
  htmlBytes: number;
};
export type AuditInput = { finalUrl: string; html: string; headers: Record<string, string>; responseMs: number };

type Check = { category: AuditCategory; weight: 1 | 2 | 3; result: "pass" | "warn" | "fail"; message: string };

const SEVERITY: Record<1 | 2 | 3, Severity> = { 3: "High", 2: "Medium", 1: "Low" };

const tagsOf = (html: string, name: string) => html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
const attr = (tag: string, name: string): string | undefined => {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : undefined;
};
const meta = (html: string, key: "name" | "property", value: string) =>
  tagsOf(html, "meta").find(tag => attr(tag, key)?.toLowerCase() === value)
    ? attr(tagsOf(html, "meta").find(tag => attr(tag, key)?.toLowerCase() === value) as string, "content")
    : undefined;
const textOf = (html: string, name: string) => {
  const match = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(html);
  return match ? match[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : undefined;
};

export function runChecks({ finalUrl, html, headers, responseMs }: AuditInput): Check[] {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const checks: Check[] = [];
  const add = (category: AuditCategory, weight: 1 | 2 | 3, result: Check["result"], message: string) => checks.push({ category, weight, result, message });
  const https = finalUrl.startsWith("https://");
  const bytes = Buffer.byteLength(html);

  // ---- Performance
  add("Performance", 3, responseMs < 600 ? "pass" : responseMs < 1500 ? "warn" : "fail", `The server took ${Math.round(responseMs)} ms to respond. Aim for under 600 ms.`);
  add("Performance", 2, bytes < 120_000 ? "pass" : bytes < 400_000 ? "warn" : "fail", `The page HTML is ${(bytes / 1024).toFixed(0)} KB. Large pages load slowly on mobile.`);
  add("Performance", 2, /gzip|br|zstd|deflate/i.test(h["content-encoding"] ?? "") ? "pass" : "fail", "Turn on text compression (gzip or Brotli) to shrink pages.");
  add("Performance", 1, h["cache-control"] || h["etag"] || h["last-modified"] ? "pass" : "warn", "Add caching headers so repeat visits load faster.");
  const blocking = tagsOf(html, "script").filter(tag => attr(tag, "src") && !/\s(async|defer|type\s*=\s*["']?module)/i.test(tag)).length;
  add("Performance", 2, blocking === 0 ? "pass" : blocking <= 3 ? "warn" : "fail", `${blocking} script${blocking === 1 ? "" : "s"} block the page from showing. Add defer or async.`);
  const images = tagsOf(html, "img");
  const unsized = images.filter(tag => !(attr(tag, "width") && attr(tag, "height"))).length;
  add("Performance", 1, unsized === 0 ? "pass" : "warn", `Give ${unsized} image${unsized === 1 ? "" : "s"} a width and height to stop the page jumping while it loads.`);
  const lazy = images.length > 3 && !images.slice(1).some(tag => /loading\s*=\s*["']?lazy/i.test(tag));
  add("Performance", 1, lazy ? "warn" : "pass", "Lazy-load images below the fold with loading=\"lazy\".");

  // ---- SEO
  const title = textOf(html, "title");
  add("SEO", 3, !title ? "fail" : title.length >= 10 && title.length <= 65 ? "pass" : "warn", !title ? "The page has no title tag." : `The title is ${title.length} characters. Keep it between 10 and 65.`);
  const description = meta(html, "name", "description");
  add("SEO", 3, !description ? "fail" : description.length >= 50 && description.length <= 170 ? "pass" : "warn", !description ? "Add a meta description so search results show a useful summary." : `The meta description is ${description.length} characters. Keep it between 50 and 170.`);
  const h1s = (html.match(/<h1\b/gi) ?? []).length;
  add("SEO", 2, h1s === 1 ? "pass" : "fail", h1s === 0 ? "The page has no main heading (h1)." : `The page has ${h1s} main headings (h1). Use exactly one.`);
  add("SEO", 2, tagsOf(html, "link").some(tag => attr(tag, "rel")?.toLowerCase() === "canonical") ? "pass" : "warn", "Add a canonical link so search engines know the preferred address.");
  add("SEO", 2, tagsOf(html, "meta").some(tag => /noindex/i.test(attr(tag, "content") ?? "") && attr(tag, "name")?.toLowerCase() === "robots") ? "fail" : "pass", "The page tells search engines not to index it (noindex).");
  add("SEO", 2, meta(html, "property", "og:title") && meta(html, "property", "og:image") ? "pass" : "warn", "Add Open Graph tags (og:title, og:image) for good link previews.");
  add("SEO", 1, /application\/ld\+json/i.test(html) ? "pass" : "warn", "Add structured data (JSON-LD) to help search engines understand the business.");
  add("SEO", 1, tagsOf(html, "meta").some(tag => attr(tag, "name")?.toLowerCase() === "viewport") ? "pass" : "fail", "Add a viewport meta tag so the page works on phones.");

  // ---- Security
  add("Security", 3, https ? "pass" : "fail", "The site is not served over HTTPS.");
  add("Security", 2, h["strict-transport-security"] ? "pass" : "warn", "Add a Strict-Transport-Security (HSTS) header.");
  add("Security", 2, h["content-security-policy"] ? "pass" : "warn", "Add a Content-Security-Policy header to limit what can run on the page.");
  add("Security", 1, /nosniff/i.test(h["x-content-type-options"] ?? "") ? "pass" : "warn", "Add the X-Content-Type-Options: nosniff header.");
  add("Security", 2, h["x-frame-options"] || /frame-ancestors/i.test(h["content-security-policy"] ?? "") ? "pass" : "warn", "Stop other sites embedding this one: add X-Frame-Options or frame-ancestors.");
  add("Security", 1, h["referrer-policy"] ? "pass" : "warn", "Add a Referrer-Policy header.");
  add("Security", 1, h["permissions-policy"] ? "pass" : "warn", "Add a Permissions-Policy header.");
  const mixed = https ? (html.match(/(?:src|href)\s*=\s*["']http:\/\/(?!www\.w3\.org)/gi) ?? []).length : 0;
  add("Security", 2, mixed === 0 ? "pass" : "fail", `${mixed} resource${mixed === 1 ? " is" : "s are"} loaded over plain HTTP on an HTTPS page.`);

  // ---- Accessibility
  const noAlt = images.filter(tag => attr(tag, "alt") === undefined).length;
  add("Accessibility", 3, noAlt === 0 ? "pass" : noAlt <= 2 ? "warn" : "fail", `Add descriptive alt text to ${noAlt} image${noAlt === 1 ? "" : "s"} for better accessibility.`);
  add("Accessibility", 2, /<html\b[^>]*\slang\s*=/i.test(html) ? "pass" : "fail", "Set the page language with <html lang=\"...\">.");
  const viewport = tagsOf(html, "meta").find(tag => attr(tag, "name")?.toLowerCase() === "viewport");
  add("Accessibility", 2, viewport && /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(viewport) ? "fail" : "pass", "The page blocks pinch-to-zoom. Remove user-scalable=no and maximum-scale=1.");
  add("Accessibility", 2, /<main\b|role\s*=\s*["']main["']/i.test(html) ? "pass" : "warn", "Add a <main> landmark so screen readers can jump to the content.");
  const controls = [...tagsOf(html, "input"), ...tagsOf(html, "textarea"), ...tagsOf(html, "select")].filter(tag => !/type\s*=\s*["']?(hidden|submit|button|image|reset)/i.test(tag));
  const unlabelled = controls.filter(tag => !(attr(tag, "aria-label") || attr(tag, "aria-labelledby") || attr(tag, "title") || (attr(tag, "id") && new RegExp(`for\\s*=\\s*["']${attr(tag, "id")}["']`, "i").test(html)))).length;
  add("Accessibility", 2, unlabelled === 0 ? "pass" : "warn", `${unlabelled} form field${unlabelled === 1 ? " has" : "s have"} no label.`);
  const emptyLinks = (html.match(/<a\b[^>]*>\s*<\/a>/gi) ?? []).filter(tag => !/aria-label/i.test(tag)).length;
  add("Accessibility", 1, emptyLinks === 0 ? "pass" : "warn", `${emptyLinks} link${emptyLinks === 1 ? " has" : "s have"} no text.`);
  add("Accessibility", 1, title ? "pass" : "fail", "The page needs a title so people know where they are.");

  // ---- Best practices
  add("Best Practices", 2, /^\s*<!doctype html/i.test(html) ? "pass" : "fail", "Start the page with <!DOCTYPE html>.");
  add("Best Practices", 1, tagsOf(html, "meta").some(tag => attr(tag, "charset") || /charset/i.test(attr(tag, "content") ?? "")) || /charset/i.test(h["content-type"] ?? "") ? "pass" : "warn", "Declare the character set (UTF-8).");
  add("Best Practices", 1, tagsOf(html, "link").some(tag => /icon/i.test(attr(tag, "rel") ?? "")) ? "pass" : "warn", "Add a favicon.");
  add("Best Practices", 2, https ? "pass" : "fail", "Serve the site over HTTPS.");
  add("Best Practices", 1, /<(font|center|marquee|blink)\b/i.test(html) ? "warn" : "pass", "Remove outdated HTML tags such as font, center and marquee.");
  add("Best Practices", 1, tagsOf(html, "a").filter(tag => attr(tag, "target")?.toLowerCase() === "_blank" && !/noopener|noreferrer/i.test(attr(tag, "rel") ?? "")).length === 0 ? "pass" : "warn", "Add rel=\"noopener\" to links that open in a new tab.");
  add("Best Practices", 1, h["server"] && /\/\d/.test(h["server"]) || h["x-powered-by"] ? "warn" : "pass", "Hide server version details (Server and X-Powered-By headers).");
  return checks;
}

export function analyze(input: AuditInput & { url: string }, now = new Date()): AuditResult {
  const checks = runChecks(input);
  const scores = {} as Record<AuditCategory, number>;
  for (const category of CATEGORIES) {
    const own = checks.filter(c => c.category === category);
    const total = own.reduce((s, c) => s + c.weight, 0);
    const earned = own.reduce((s, c) => s + c.weight * (c.result === "pass" ? 1 : c.result === "warn" ? 0.5 : 0), 0);
    scores[category] = Math.round((earned / total) * 100);
  }
  const overall = Math.round(CATEGORIES.reduce((s, c) => s + scores[c], 0) / CATEGORIES.length);
  const order = { High: 0, Medium: 1, Low: 2 } as const;
  const findings = checks
    .filter(c => c.result !== "pass")
    .map(c => ({ category: c.category, severity: c.result === "warn" && c.weight === 3 ? "Medium" as Severity : SEVERITY[c.weight], message: c.message }))
    .sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    url: input.url, finalUrl: input.finalUrl, auditedAt: now.toISOString(), overall, scores, findings,
    passed: checks.filter(c => c.result === "pass").length, total: checks.length,
    responseMs: Math.round(input.responseMs), htmlBytes: Buffer.byteLength(input.html),
  };
}

/** Plain-English verdict for an overall score. */
export function verdict(score: number): { label: string; text: string } {
  if (score >= 90) return { label: "Great", text: "This website is performing well, with a few opportunities for improvement." };
  if (score >= 75) return { label: "Good", text: "A solid base. Fixing the findings below will lift it further." };
  if (score >= 50) return { label: "Needs work", text: "Several important issues are holding this website back." };
  return { label: "Poor", text: "This website has serious problems that should be fixed first." };
}
