/**
 * Website audit.
 *
 * Two sources feed the same report:
 *  - "lighthouse": real Google Lighthouse results via PageSpeed Insights (needs PAGESPEED_API_KEY),
 *    plus our own security-header checks, which Lighthouse does not score.
 *  - "quick": a strict built-in check of the page's HTML, headers and response time. It cannot
 *    measure rendering or Core Web Vitals, so it is a health check, not a Lighthouse run.
 */

export type Severity = "High" | "Medium" | "Low";
export type AuditCategory = "Performance" | "SEO" | "Security" | "Accessibility" | "Best Practices";
export const CATEGORIES: AuditCategory[] = ["Performance", "SEO", "Security", "Accessibility", "Best Practices"];

export type AuditFinding = { category: AuditCategory; severity: Severity; message: string };
export type AuditMetric = { label: string; value: string; rating: "good" | "ok" | "bad" };
export type AuditResult = {
  url: string;
  finalUrl: string;
  auditedAt: string;
  source: "lighthouse" | "quick";
  notice?: string;
  overall: number;
  scores: Record<AuditCategory, number>;
  findings: AuditFinding[];
  metrics?: AuditMetric[];
  passed: number;
  total: number;
  responseMs: number;
  htmlBytes: number;
};
export type AuditExtras = { httpRedirectsToHttps?: boolean; robots?: boolean; sitemap?: boolean };
export type AuditInput = { finalUrl: string; html: string; headers: Record<string, string>; responseMs: number; extras?: AuditExtras };

export type Check = { category: AuditCategory; weight: 1 | 2 | 3; result: "pass" | "warn" | "fail" | "na"; message: string };

const tagsOf = (html: string, name: string) => html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
const attr = (tag: string, name: string): string | undefined => {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : undefined;
};
const metaContent = (html: string, key: "name" | "property", value: string) => {
  const tag = tagsOf(html, "meta").find(t => attr(t, key)?.toLowerCase() === value);
  return tag ? attr(tag, "content") : undefined;
};
const textOf = (html: string, name: string) => {
  const match = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(html);
  return match ? match[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : undefined;
};
const visibleText = (html: string) => html.replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

/** Security-header checks. Shared by both sources, because Lighthouse does not score security. */
export function securityChecks({ finalUrl, html, headers, extras }: AuditInput): Check[] {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const https = finalUrl.startsWith("https://");
  const out: Check[] = [];
  const add = (weight: 1 | 2 | 3, result: Check["result"], message: string) => out.push({ category: "Security", weight, result, message });
  add(3, https ? "pass" : "fail", "The site is not served over HTTPS, so visitors see a \"Not secure\" warning and data is sent unencrypted.");
  if (https && extras?.httpRedirectsToHttps !== undefined) add(2, extras.httpRedirectsToHttps ? "pass" : "fail", "The plain http:// address does not redirect to https://.");
  add(2, h["strict-transport-security"] ? "pass" : "fail", "Add a Strict-Transport-Security (HSTS) header so browsers always use HTTPS.");
  add(2, h["content-security-policy"] ? "pass" : "fail", "Add a Content-Security-Policy header to limit what can run on the page.");
  add(1, /nosniff/i.test(h["x-content-type-options"] ?? "") ? "pass" : "fail", "Add the X-Content-Type-Options: nosniff header.");
  add(2, h["x-frame-options"] || /frame-ancestors/i.test(h["content-security-policy"] ?? "") ? "pass" : "fail", "Stop other sites embedding this one: add X-Frame-Options or frame-ancestors.");
  add(1, h["referrer-policy"] ? "pass" : "fail", "Add a Referrer-Policy header.");
  add(1, h["permissions-policy"] ? "pass" : "fail", "Add a Permissions-Policy header.");
  const mixed = https ? (html.match(/(?:src|href)\s*=\s*["']http:\/\/(?!www\.w3\.org)/gi) ?? []).length : 0;
  if (https) add(3, mixed === 0 ? "pass" : "fail", `${mixed} resource${mixed === 1 ? " is" : "s are"} loaded over plain HTTP on an HTTPS page.`);
  const leaks = (h["server"] && /\/\d/.test(h["server"])) || h["x-powered-by"];
  add(1, leaks ? "warn" : "pass", "Hide server version details (the Server and X-Powered-By headers).");
  const oldJquery = /jquery[-.](1\.|2\.)\d/i.test(html) || /jquery\.min\.js\?ver=(1|2)\./i.test(html);
  add(2, oldJquery ? "fail" : "pass", "The page loads an outdated jQuery (1.x or 2.x) with known security flaws.");
  return out;
}

/** The strict built-in checks for the four areas Lighthouse would otherwise score. */
export function contentChecks({ finalUrl, html, headers, responseMs, extras }: AuditInput): Check[] {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const out: Check[] = [];
  const add = (category: AuditCategory, weight: 1 | 2 | 3, result: Check["result"], message: string) => out.push({ category, weight, result, message });
  const https = finalUrl.startsWith("https://");
  const bytes = Buffer.byteLength(html);
  const images = tagsOf(html, "img");
  const scripts = tagsOf(html, "script");
  const sheets = tagsOf(html, "link").filter(t => /stylesheet/i.test(attr(t, "rel") ?? ""));
  const text = visibleText(html);
  const words = text ? text.split(" ").length : 0;
  const viewport = tagsOf(html, "meta").find(t => attr(t, "name")?.toLowerCase() === "viewport");
  const title = textOf(html, "title");
  const tableCount = (html.match(/<table\b/gi) ?? []).length;
  const deprecated = (html.match(/<(font|center|marquee|blink|frameset|frame|basefont|big|strike|applet)\b/gi) ?? []).length + (html.match(/\s(bgcolor|background|align|valign|cellpadding)\s*=/gi) ?? []).length;
  const inlineStyles = (html.match(/\sstyle\s*=/gi) ?? []).length;
  const hasMediaQueries = /@media[^{]*\(/i.test(html) || sheets.some(t => /media\s*=\s*["'][^"']*\(/i.test(t));

  // ---- Performance
  add("Performance", 3, responseMs < 500 ? "pass" : responseMs < 1000 ? "warn" : "fail", `The server took ${Math.round(responseMs)} ms to respond. Aim for under 500 ms.`);
  add("Performance", 2, bytes < 80_000 ? "pass" : bytes < 250_000 ? "warn" : "fail", `The page HTML is ${(bytes / 1024).toFixed(0)} KB. Large pages load slowly on mobile.`);
  add("Performance", 2, /gzip|br|zstd|deflate/i.test(h["content-encoding"] ?? "") ? "pass" : "fail", "Turn on text compression (gzip or Brotli) to shrink pages.");
  add("Performance", 1, h["cache-control"] || h["etag"] || h["last-modified"] ? "pass" : "warn", "Add caching headers so repeat visits load faster.");
  const blocking = scripts.filter(t => attr(t, "src") && !/\s(async|defer)\b|type\s*=\s*["']?module/i.test(t)).length;
  if (scripts.length > 0) add("Performance", 2, blocking === 0 ? "pass" : blocking <= 2 ? "warn" : "fail", `${blocking} script${blocking === 1 ? "" : "s"} block the page from showing. Add defer or async.`);
  add("Performance", 2, scripts.length + sheets.length <= 12 ? "pass" : scripts.length + sheets.length <= 25 ? "warn" : "fail", `The page pulls in ${scripts.length + sheets.length} script and style files. Fewer, combined files load faster.`);
  if (images.length > 0) {
    const unsized = images.filter(t => !(attr(t, "width") && attr(t, "height"))).length;
    add("Performance", 1, unsized === 0 ? "pass" : "warn", `Give ${unsized} image${unsized === 1 ? "" : "s"} a width and height to stop the page jumping while it loads.`);
    const legacy = images.filter(t => /\.(gif|bmp|tiff?)(\?|["']|$)/i.test(attr(t, "src") ?? "")).length;
    add("Performance", 1, legacy === 0 ? "pass" : "warn", `${legacy} image${legacy === 1 ? " uses" : "s use"} an outdated format. Use WebP, AVIF or optimised JPEG and PNG.`);
    if (images.length > 3) add("Performance", 1, images.slice(1).some(t => /loading\s*=\s*["']?lazy/i.test(t)) ? "pass" : "warn", "Lazy-load images below the fold with loading=\"lazy\".");
    add("Performance", 1, images.length <= 30 ? "pass" : "warn", `The page has ${images.length} images. Consider loading fewer on first view.`);
  }
  add("Performance", 1, inlineStyles <= 25 ? "pass" : "warn", `${inlineStyles} inline style attributes bloat the page. Move them into a stylesheet.`);

  // ---- SEO
  add("SEO", 3, !title ? "fail" : title.length >= 15 && title.length <= 65 && !/^(untitled|home|welcome|index|new page)\b/i.test(title) ? "pass" : "warn", !title ? "The page has no title tag." : `The title "${title.slice(0, 40)}${title.length > 40 ? "…" : ""}" is weak (${title.length} characters). Write a descriptive 15 to 65 character title.`);
  const description = metaContent(html, "name", "description");
  add("SEO", 3, !description ? "fail" : description.length >= 70 && description.length <= 165 ? "pass" : "warn", !description ? "Add a meta description so search results show a useful summary." : `The meta description is ${description.length} characters. Keep it between 70 and 165.`);
  const h1s = (html.match(/<h1\b/gi) ?? []).length;
  add("SEO", 2, h1s === 1 ? "pass" : "fail", h1s === 0 ? "The page has no main heading (h1)." : `The page has ${h1s} main headings (h1). Use exactly one.`);
  add("SEO", 1, /<h2\b/i.test(html) ? "pass" : "warn", "Break the content up with h2 sub-headings.");
  add("SEO", 3, words >= 250 ? "pass" : words >= 100 ? "warn" : "fail", `The page has only ${words} words of text. Thin pages rank poorly. Aim for 250 or more.`);
  add("SEO", 2, tagsOf(html, "link").some(t => attr(t, "rel")?.toLowerCase() === "canonical") ? "pass" : "warn", "Add a canonical link so search engines know the preferred address.");
  add("SEO", 3, tagsOf(html, "meta").some(t => attr(t, "name")?.toLowerCase() === "robots" && /noindex/i.test(attr(t, "content") ?? "")) ? "fail" : "pass", "The page tells search engines not to index it (noindex).");
  add("SEO", 2, metaContent(html, "property", "og:title") && metaContent(html, "property", "og:image") ? "pass" : "warn", "Add Open Graph tags (og:title, og:image) for good link previews when shared.");
  add("SEO", 1, /application\/ld\+json/i.test(html) ? "pass" : "warn", "Add structured data (JSON-LD) so search engines understand the business.");
  add("SEO", 3, viewport ? "pass" : "fail", "Add a viewport meta tag. Without it the page is not mobile-friendly, and Google ranks it lower.");
  const links = tagsOf(html, "a");
  add("SEO", 1, links.filter(t => /^(\/|#|\.|[a-z0-9_-]+(\.html?)?$)/i.test(attr(t, "href") ?? "")).length >= 3 ? "pass" : "warn", "The page has very few internal links. Link to other pages on the site.");
  if (extras?.robots !== undefined) add("SEO", 1, extras.robots ? "pass" : "warn", "No robots.txt file was found.");
  if (extras?.sitemap !== undefined) add("SEO", 2, extras.sitemap ? "pass" : "warn", "No sitemap.xml was found. A sitemap helps search engines find every page.");

  // ---- Accessibility
  if (images.length > 0) {
    const noAlt = images.filter(t => attr(t, "alt") === undefined).length;
    add("Accessibility", 3, noAlt === 0 ? "pass" : noAlt <= 2 ? "warn" : "fail", `Add descriptive alt text to ${noAlt} image${noAlt === 1 ? "" : "s"} for better accessibility.`);
    const emptyAlt = images.filter(t => attr(t, "alt") !== undefined && attr(t, "alt")!.trim() === "" && !/role\s*=\s*["']presentation/i.test(t)).length;
    add("Accessibility", 1, emptyAlt > images.length * 0.6 && images.length > 2 ? "warn" : "pass", "Most images have empty alt text. Describe the meaningful ones.");
  }
  add("Accessibility", 3, /<html\b[^>]*\slang\s*=/i.test(html) ? "pass" : "fail", "Set the page language with <html lang=\"en\">.");
  add("Accessibility", 3, viewport && /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(viewport) ? "fail" : "pass", "The page blocks pinch-to-zoom. Remove user-scalable=no and maximum-scale=1.");
  add("Accessibility", 2, /<main\b|role\s*=\s*["']main["']/i.test(html) ? "pass" : "warn", "Add a <main> landmark so screen readers can jump to the content.");
  add("Accessibility", 1, /<(nav|header|footer)\b/i.test(html) ? "pass" : "warn", "Use semantic nav, header and footer elements.");
  const controls = [...tagsOf(html, "input"), ...tagsOf(html, "textarea"), ...tagsOf(html, "select")].filter(t => !/type\s*=\s*["']?(hidden|submit|button|image|reset)/i.test(t));
  if (controls.length > 0) {
    const unlabelled = controls.filter(t => !(attr(t, "aria-label") || attr(t, "aria-labelledby") || attr(t, "title") || (attr(t, "id") && new RegExp(`for\\s*=\\s*["']${attr(t, "id")}["']`, "i").test(html)))).length;
    add("Accessibility", 3, unlabelled === 0 ? "pass" : "fail", `${unlabelled} form field${unlabelled === 1 ? " has" : "s have"} no label.`);
  }
  const emptyLinks = (html.match(/<a\b[^>]*>\s*<\/a>/gi) ?? []).filter(t => !/aria-label/i.test(t)).length;
  add("Accessibility", 2, emptyLinks === 0 ? "pass" : "warn", `${emptyLinks} link${emptyLinks === 1 ? " has" : "s have"} no text.`);
  const vague = links.length ? (html.match(/<a\b[^>]*>\s*(click here|here|read more|more|link)\s*<\/a>/gi) ?? []).length : 0;
  add("Accessibility", 1, vague === 0 ? "pass" : "warn", `${vague} link${vague === 1 ? " uses" : "s use"} vague text like "click here".`);
  add("Accessibility", 2, tableCount >= 2 && !/<th\b/i.test(html) ? "fail" : "pass", "Layout tables are used without headers. Use CSS for layout.");
  add("Accessibility", 2, /<(marquee|blink)\b/i.test(html) ? "fail" : "pass", "Moving or blinking content cannot be paused. Remove it.");
  add("Accessibility", 2, /color\s*[:=]\s*["']?#?(fff|ffffff|white)["']?[^>]*background(-color)?\s*[:=]\s*["']?#?(fff|ffffff|white)/i.test(html) ? "fail" : "pass", "Text colour matches its background in places.");

  // ---- Best practices
  add("Best Practices", 3, viewport ? "pass" : "fail", "The page is not responsive: there is no viewport meta tag, so phones show a tiny desktop layout.");
  add("Best Practices", 3, hasMediaQueries ? "pass" : "warn", "No responsive CSS (media queries) was found in the page.");
  add("Best Practices", 2, /^\s*<!doctype html/i.test(html) ? "pass" : "fail", "Start the page with <!DOCTYPE html>.");
  add("Best Practices", 1, tagsOf(html, "meta").some(t => attr(t, "charset") || /charset/i.test(attr(t, "content") ?? "")) || /charset/i.test(h["content-type"] ?? "") ? "pass" : "warn", "Declare the character set (UTF-8).");
  add("Best Practices", 1, tagsOf(html, "link").some(t => /icon/i.test(attr(t, "rel") ?? "")) ? "pass" : "warn", "Add a favicon.");
  add("Best Practices", 3, https ? "pass" : "fail", "Serve the site over HTTPS.");
  add("Best Practices", 3, deprecated === 0 ? "pass" : deprecated <= 3 ? "warn" : "fail", `${deprecated} outdated HTML features are used (font, center, marquee, bgcolor, align...). Use modern CSS.`);
  add("Best Practices", 3, tableCount >= 3 ? "fail" : tableCount >= 1 ? "warn" : "pass", `${tableCount} table${tableCount === 1 ? " is" : "s are"} on the page, often a sign of table-based layout. Use CSS grid or flexbox.`);
  add("Best Practices", 2, /document\.write\s*\(/i.test(html) ? "fail" : "pass", "The page uses document.write, which blocks loading and is discouraged.");
  add("Best Practices", 2, /<(embed|object|applet)\b/i.test(html) || /\.swf\b/i.test(html) ? "fail" : "pass", "Flash or plug-in content is used. Browsers no longer support it.");
  add("Best Practices", 1, links.filter(t => attr(t, "target")?.toLowerCase() === "_blank" && !/noopener|noreferrer/i.test(attr(t, "rel") ?? "")).length === 0 ? "pass" : "warn", "Add rel=\"noopener\" to links that open in a new tab.");
  add("Best Practices", 2, /under construction|coming soon|lorem ipsum|your text here|click to edit/i.test(text) ? "fail" : "pass", "The page has placeholder text (such as \"under construction\" or \"lorem ipsum\").");
  add("Best Practices", 2, inlineStyles > 60 ? "fail" : "pass", `${inlineStyles} inline styles. Keep styling in a stylesheet.`);
  return out;
}

export function scoreChecks(checks: Check[]): { scores: Record<AuditCategory, number>; passed: number; total: number } {
  const scores = {} as Record<AuditCategory, number>;
  for (const category of CATEGORIES) {
    const own = checks.filter(c => c.category === category && c.result !== "na");
    const total = own.reduce((s, c) => s + c.weight, 0);
    const earned = own.reduce((s, c) => s + c.weight * (c.result === "pass" ? 1 : c.result === "warn" ? 0.4 : 0), 0);
    // Squaring the ratio punishes real problems instead of letting many trivial passes hide them.
    const ratio = total === 0 ? 1 : earned / total;
    scores[category] = Math.round(100 * Math.pow(ratio, 1.8));
    // A site with a high-weight failure cannot score in the 90s for that area.
    if (own.some(c => c.result === "fail" && c.weight === 3)) scores[category] = Math.min(scores[category], 79);
  }
  const live = checks.filter(c => c.result !== "na");
  return { scores, passed: live.filter(c => c.result === "pass").length, total: live.length };
}

export function findingsFrom(checks: Check[]): AuditFinding[] {
  const order = { High: 0, Medium: 1, Low: 2 } as const;
  const step = (weight: 1 | 2 | 3): Severity => (weight === 3 ? "High" : weight === 2 ? "Medium" : "Low");
  const downgrade = (s: Severity): Severity => (s === "High" ? "Medium" : "Low");
  return checks
    .filter(c => c.result === "warn" || c.result === "fail")
    .map(c => ({ category: c.category, severity: c.result === "warn" ? downgrade(step(c.weight)) : step(c.weight), message: c.message }))
    .sort((a, b) => order[a.severity] - order[b.severity]);
}

export const average = (scores: Record<AuditCategory, number>) => Math.round(CATEGORIES.reduce((s, c) => s + scores[c], 0) / CATEGORIES.length);

/** Quick check, used when no PageSpeed key is configured or Google is unavailable. */
export function analyze(input: AuditInput & { url: string }, now = new Date(), notice?: string): AuditResult {
  const checks = [...contentChecks(input), ...securityChecks(input)];
  const { scores, passed, total } = scoreChecks(checks);
  return {
    url: input.url, finalUrl: input.finalUrl, auditedAt: now.toISOString(), source: "quick", notice,
    overall: average(scores), scores, findings: findingsFrom(checks), passed, total,
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
