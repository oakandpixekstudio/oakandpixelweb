/**
 * Website audit.
 *
 * Seven areas are scored:
 *  Performance, SEO, Security, Accessibility, Best Practices, Brand & Design, Content & Conversion.
 *
 * Sources:
 *  - "lighthouse": real Google Lighthouse results via PageSpeed Insights (needs PAGESPEED_API_KEY) replace the
 *    first four areas; the other three always come from our own checks.
 *  - "quick": strict built-in checks of the page HTML, its stylesheets, response headers and speed.
 *  - Brand & Design can also include an AI design review of the page screenshot (needs ANTHROPIC_API_KEY).
 */

export type Severity = "High" | "Medium" | "Low";
export type AuditCategory = "Performance" | "SEO" | "Security" | "Accessibility" | "Best Practices" | "Brand & Design" | "Content & Conversion";
export const CATEGORIES: AuditCategory[] = ["Performance", "SEO", "Security", "Accessibility", "Best Practices", "Brand & Design", "Content & Conversion"];

export const FOCUS: Record<AuditCategory, string> = {
  Performance: "Loading speed and page weight",
  SEO: "Search visibility and metadata",
  Security: "HTTPS and security headers",
  Accessibility: "Inclusive access and usability",
  "Best Practices": "Technical setup and web standards",
  "Brand & Design": "Look, typography, colour and consistency",
  "Content & Conversion": "Clarity, trust and getting enquiries",
};

export const VERIFY: Record<AuditCategory, string> = {
  Performance: "Re-run the audit and compare response time, page weight and, with Lighthouse, the Core Web Vitals before and after the change.",
  SEO: "View the page source and Google Search Console to confirm titles, descriptions and indexing are correct, then re-run the audit.",
  Security: "Re-run the audit, then check the response headers at securityheaders.com and confirm http:// redirects to https://.",
  Accessibility: "Re-run the automated checks, then test the page with the keyboard only and with a screen reader.",
  "Best Practices": "Re-run the audit and test the page on a phone and in current Chrome, Safari and Firefox.",
  "Brand & Design": "Review the live page on a phone and on desktop against your brand guide, then re-run the audit.",
  "Content & Conversion": "Walk through the page as a first-time visitor: within five seconds can they see what you do and how to contact you?",
};

export type AuditFinding = { category: AuditCategory; severity: Severity; message: string; fix?: string; verify?: string };
export type AuditMetric = { label: string; value: string; rating: "good" | "ok" | "bad" };
export type BrandReview = { summary: string; strengths: string[]; ratings: { label: string; score: number }[] };
export type AuditResult = {
  url: string;
  finalUrl: string;
  auditedAt: string;
  source: "lighthouse" | "quick";
  notice?: string;
  preparedFor?: string;
  overall: number;
  scores: Record<AuditCategory, number>;
  findings: AuditFinding[];
  strengths: string[];
  metrics?: AuditMetric[];
  screenshot?: string;
  brandReview?: BrandReview;
  passed: number;
  total: number;
  responseMs: number;
  htmlBytes: number;
};
/** True when the served HTML is an empty shell that a script fills in (Canva, Wix, React apps...). Static checks cannot see the real page then. */
export function isClientRendered(html: string): boolean {
  const words = visibleText(html).split(" ").filter(Boolean).length;
  return words < 40 && /<script/i.test(html);
}
export const CLIENT_RENDERED_NOTICE = "This website builds its pages with JavaScript, so the quick checks only see an empty shell. Content, SEO and design findings may be wrong. Add a PageSpeed key (Google renders the page) and an Anthropic key (AI reads the screenshot) for a true picture.";
export type AuditExtras = { httpRedirectsToHttps?: boolean; robots?: boolean; sitemap?: boolean };
export type AuditInput = { finalUrl: string; html: string; headers: Record<string, string>; responseMs: number; extras?: AuditExtras; css?: string };

export type Check = { category: AuditCategory; weight: 1 | 2 | 3; result: "pass" | "warn" | "fail" | "na"; message: string; fix: string; good?: string };

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

/* ---------------------------------------------------------------- colour */

type Rgb = [number, number, number];
export function parseColor(value: string): Rgb | null {
  const v = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  if (hex) { const h = hex[1].length === 3 ? hex[1].split("").map(c => c + c).join("") : hex[1]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(v);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const named: Record<string, Rgb> = { white: [255, 255, 255], black: [0, 0, 0], red: [255, 0, 0], yellow: [255, 255, 0], silver: [192, 192, 192], gray: [128, 128, 128], grey: [128, 128, 128], lime: [0, 255, 0], aqua: [0, 255, 255], blue: [0, 0, 255], fuchsia: [255, 0, 255] };
  return named[v] ?? null;
}
const luminance = ([r, g, b]: Rgb) => { const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export function contrastRatio(a: Rgb, b: Rgb): number { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); }
const isNeutral = ([r, g, b]: Rgb) => Math.max(r, g, b) - Math.min(r, g, b) < 24;

const COLOR_TOKEN = /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgba?\(\s*\d+[^)]*\)|\b(?:white|black|red|yellow|silver|gray|grey|lime|aqua|blue|fuchsia)\b/i;

/** Pairs of text and background colours declared together, and how many fall below WCAG AA (4.5:1). */
export function lowContrast(css: string, html: string): { pairs: number; failing: number; worst?: number } {
  const blocks = [...css.matchAll(/\{([^{}]*)\}/g)].map(m => m[1]);
  const inline = [...html.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map(m => m[1]);
  let pairs = 0; let failing = 0; let worst: number | undefined;
  for (const body of [...blocks, ...inline]) {
    const fg = /(?:^|[;\s])color\s*:\s*([^;]+)/i.exec(body)?.[1];
    const bg = /background(?:-color)?\s*:\s*([^;]+)/i.exec(body)?.[1];
    const f = fg && COLOR_TOKEN.exec(fg) ? parseColor(COLOR_TOKEN.exec(fg)![0]) : null;
    const b = bg && COLOR_TOKEN.exec(bg) ? parseColor(COLOR_TOKEN.exec(bg)![0]) : null;
    if (!f || !b) continue;
    pairs += 1;
    const ratio = contrastRatio(f, b);
    if (ratio < 4.5) { failing += 1; worst = worst === undefined ? ratio : Math.min(worst, ratio); }
  }
  return { pairs, failing, worst };
}

const GENERIC_FONTS = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "inherit", "initial", "unset", "ui-sans-serif", "ui-serif", "ui-monospace", "-apple-system", "blinkmacsystemfont", "emoji", "math"]);
export function fontFamilies(css: string, html: string): string[] {
  const found = new Set<string>();
  for (const match of `${css}\n${[...html.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map(m => m[1]).join(";")}`.matchAll(/font-family\s*:\s*([^;}]+)/gi)) {
    const first = match[1].split(",")[0].replace(/["'!important]/g, "").trim().toLowerCase();
    if (first && !GENERIC_FONTS.has(first) && !first.startsWith("var(")) found.add(first);
  }
  return [...found];
}

export function paletteOf(css: string, html: string): string[] {
  const set = new Set<string>();
  for (const m of `${css}\n${html}`.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/gi)) {
    const rgb = parseColor(m[0].includes("rgb") ? `${m[0]})` : m[0]);
    if (rgb && !isNeutral(rgb)) set.add(rgb.map(c => Math.round(c / 8) * 8).join(","));
  }
  return [...set];
}

/* --------------------------------------------------------------- security */

/** Security-header checks. Shared by both sources, because Lighthouse does not score security. */
export function securityChecks({ finalUrl, html, headers, extras }: AuditInput): Check[] {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const https = finalUrl.startsWith("https://");
  const out: Check[] = [];
  const add = (weight: 1 | 2 | 3, result: Check["result"], message: string, fix: string, good?: string) => out.push({ category: "Security", weight, result, message, fix, good });
  add(3, https ? "pass" : "fail", "The site is not served over HTTPS, so visitors see a “Not secure” warning and data is sent unencrypted.", "Install an SSL certificate (free with Let's Encrypt, or included with most hosts) and serve every page over HTTPS.", "The site is served over HTTPS.");
  if (https && extras?.httpRedirectsToHttps !== undefined) add(2, extras.httpRedirectsToHttps ? "pass" : "fail", "The plain http:// address does not redirect to https://.", "Add a permanent (301) redirect from http:// to https:// at your host or CDN.", "http:// redirects to https://.");
  add(2, h["strict-transport-security"] ? "pass" : "fail", "There is no Strict-Transport-Security (HSTS) header, so browsers can still be tricked into using plain HTTP.", "Send `Strict-Transport-Security: max-age=31536000; includeSubDomains` from your server or host.", "HSTS is enabled.");
  add(2, h["content-security-policy"] ? "pass" : "fail", "There is no Content-Security-Policy header to limit what can run on the page.", "Add a Content-Security-Policy that allows only the scripts, styles and images you use.", "A Content-Security-Policy is set.");
  add(1, /nosniff/i.test(h["x-content-type-options"] ?? "") ? "pass" : "fail", "The X-Content-Type-Options: nosniff header is missing.", "Send `X-Content-Type-Options: nosniff`.");
  add(2, h["x-frame-options"] || /frame-ancestors/i.test(h["content-security-policy"] ?? "") ? "pass" : "fail", "Other websites can embed this one in a frame (clickjacking risk).", "Send `X-Frame-Options: SAMEORIGIN` or a CSP `frame-ancestors` rule.");
  add(1, h["referrer-policy"] ? "pass" : "fail", "There is no Referrer-Policy header.", "Send `Referrer-Policy: strict-origin-when-cross-origin`.");
  add(1, h["permissions-policy"] ? "pass" : "fail", "There is no Permissions-Policy header.", "Send a Permissions-Policy that turns off features you do not use (camera, microphone, geolocation).");
  const mixed = https ? (html.match(/(?:src|href)\s*=\s*["']http:\/\/(?!www\.w3\.org)/gi) ?? []).length : 0;
  if (https) add(3, mixed === 0 ? "pass" : "fail", `${mixed} resource${mixed === 1 ? " is" : "s are"} loaded over plain HTTP on an HTTPS page, which browsers block or warn about.`, "Change every http:// link to a resource into https://.", "No mixed content.");
  const leaks = (h["server"] && /\/\d/.test(h["server"])) || h["x-powered-by"];
  add(1, leaks ? "warn" : "pass", "The server reveals its software and version in headers, which helps attackers.", "Remove or hide the Server and X-Powered-By headers.");
  const oldJquery = /jquery[-.](1\.|2\.)\d/i.test(html) || /jquery\.min\.js\?ver=(1|2)\./i.test(html);
  add(2, oldJquery ? "fail" : "pass", "The page loads an outdated jQuery (1.x or 2.x) with known security flaws.", "Upgrade to the current jQuery 3.x, or remove it if it is no longer needed.");
  return out;
}

/* ---------------------------------------------------------------- content */

export function contentChecks({ finalUrl, html, headers, responseMs, extras, css = "" }: AuditInput, now = new Date()): Check[] {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const out: Check[] = [];
  const add = (category: AuditCategory, weight: 1 | 2 | 3, result: Check["result"], message: string, fix: string, good?: string) => out.push({ category, weight, result, message, fix, good });
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
  const allCss = `${css}\n${[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join("\n")}`;
  const hasMediaQueries = /@media[^{]*\(/i.test(allCss) || sheets.some(t => /media\s*=\s*["'][^"']*\(/i.test(t));
  const links = tagsOf(html, "a");
  const hrefs = links.map(t => (attr(t, "href") ?? "").toLowerCase());
  const anchorTexts = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map(m => m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase());

  // ---- Performance
  add("Performance", 3, responseMs < 500 ? "pass" : responseMs < 1000 ? "warn" : "fail", `The server took ${Math.round(responseMs)} ms to respond. Aim for under 500 ms.`, "Use a faster host or CDN, enable server caching, and reduce slow database or plugin work on page load.", `The server responds quickly (${Math.round(responseMs)} ms).`);
  add("Performance", 2, bytes < 80_000 ? "pass" : bytes < 250_000 ? "warn" : "fail", `The page HTML is ${(bytes / 1024).toFixed(0)} KB. Large pages load slowly on mobile.`, "Remove unused markup and inline code, and move scripts and styles into cached files.");
  add("Performance", 2, /gzip|br|zstd|deflate/i.test(h["content-encoding"] ?? "") ? "pass" : "fail", "Text compression (gzip or Brotli) is off, so every page downloads larger than it needs to.", "Turn on gzip or Brotli compression at your host or CDN.");
  add("Performance", 1, h["cache-control"] || h["etag"] || h["last-modified"] ? "pass" : "warn", "No caching headers were found, so repeat visitors re-download everything.", "Send Cache-Control headers for images, scripts and styles.");
  const blocking = scripts.filter(t => attr(t, "src") && !/\s(async|defer)\b|type\s*=\s*["']?module/i.test(t)).length;
  if (scripts.length > 0) add("Performance", 2, blocking === 0 ? "pass" : blocking <= 2 ? "warn" : "fail", `${blocking} script${blocking === 1 ? "" : "s"} block the page from showing.`, "Add `defer` or `async` to script tags, or move them to the end of the page.");
  add("Performance", 2, scripts.length + sheets.length <= 12 ? "pass" : scripts.length + sheets.length <= 25 ? "warn" : "fail", `The page pulls in ${scripts.length + sheets.length} script and style files. Fewer, combined files load faster.`, "Combine and minify scripts and stylesheets, and remove ones you do not use.");
  if (images.length > 0) {
    const unsized = images.filter(t => !(attr(t, "width") && attr(t, "height"))).length;
    add("Performance", 1, unsized === 0 ? "pass" : "warn", `${unsized} image${unsized === 1 ? " has" : "s have"} no width and height, so the page jumps while loading.`, "Add width and height attributes to every image.");
    const legacy = images.filter(t => /\.(gif|bmp|tiff?)(\?|["']|$)/i.test(attr(t, "src") ?? "")).length;
    add("Performance", 1, legacy === 0 ? "pass" : "warn", `${legacy} image${legacy === 1 ? " uses" : "s use"} an outdated format.`, "Convert images to WebP or AVIF, or optimised JPEG and PNG.");
    if (images.length > 3) add("Performance", 1, images.slice(1).some(t => /loading\s*=\s*["']?lazy/i.test(t)) ? "pass" : "warn", "Images below the fold are not lazy-loaded.", "Add `loading=\"lazy\"` to images that are not visible on first load.");
    add("Performance", 1, images.length <= 30 ? "pass" : "warn", `The page has ${images.length} images, which slows the first view.`, "Load fewer images up front and use lazy loading for the rest.");
    if (images.length > 2) add("Performance", 1, tagsOf(html, "picture").length > 0 || images.some(t => attr(t, "srcset")) ? "pass" : "warn", "Images are not responsive, so phones download desktop-sized files.", "Use `srcset` or `<picture>` to serve smaller images to smaller screens.");
  }
  add("Performance", 1, inlineStyles <= 25 ? "pass" : "warn", `${inlineStyles} inline style attributes bloat the page.`, "Move inline styles into a stylesheet.");

  // ---- SEO
  add("SEO", 3, !title ? "fail" : title.length >= 15 && title.length <= 65 && !/^(untitled|home|welcome|index|new page)\b/i.test(title) ? "pass" : "warn", !title ? "The page has no title tag." : `The title “${title.slice(0, 40)}${title.length > 40 ? "…" : ""}” is weak (${title.length} characters).`, "Write a descriptive 15 to 65 character title that includes what you do and where.", "The page has a clear title.");
  const description = metaContent(html, "name", "description");
  add("SEO", 3, !description ? "fail" : description.length >= 70 && description.length <= 165 ? "pass" : "warn", !description ? "There is no meta description, so search results show a random snippet." : `The meta description is ${description.length} characters.`, "Write a 70 to 165 character meta description that sells the click.", "A good meta description is set.");
  const h1s = (html.match(/<h1\b/gi) ?? []).length;
  add("SEO", 2, h1s === 1 ? "pass" : "fail", h1s === 0 ? "The page has no main heading (h1)." : `The page has ${h1s} main headings (h1).`, "Use exactly one h1 that states what the page is about.");
  add("SEO", 1, /<h2\b/i.test(html) ? "pass" : "warn", "The content is not broken up with h2 sub-headings.", "Add h2 sub-headings for each section.");
  add("SEO", 3, words >= 250 ? "pass" : words >= 100 ? "warn" : "fail", `The page has only ${words} words of text. Thin pages rank poorly.`, "Write at least 250 words of useful, original copy for the page.");
  add("SEO", 2, tagsOf(html, "link").some(t => attr(t, "rel")?.toLowerCase() === "canonical") ? "pass" : "warn", "There is no canonical link, so search engines may index duplicate versions.", "Add `<link rel=\"canonical\" href=\"…\">` pointing at the preferred address.");
  add("SEO", 3, tagsOf(html, "meta").some(t => attr(t, "name")?.toLowerCase() === "robots" && /noindex/i.test(attr(t, "content") ?? "")) ? "fail" : "pass", "The page tells search engines not to index it (noindex).", "Remove the noindex robots tag so the page can appear in search.");
  add("SEO", 2, metaContent(html, "property", "og:title") && metaContent(html, "property", "og:image") ? "pass" : "warn", "There are no Open Graph tags, so shared links look plain on WhatsApp, Facebook and LinkedIn.", "Add og:title, og:description and og:image meta tags.");
  add("SEO", 1, /application\/ld\+json/i.test(html) ? "pass" : "warn", "There is no structured data (JSON-LD).", "Add LocalBusiness or Organization JSON-LD so search engines understand the business.");
  add("SEO", 3, viewport ? "pass" : "fail", "There is no viewport meta tag, so the page is not mobile-friendly and Google ranks it lower.", "Add `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">`.");
  add("SEO", 1, links.filter(t => /^(\/|#|\.|[a-z0-9_-]+(\.html?)?$)/i.test(attr(t, "href") ?? "")).length >= 3 ? "pass" : "warn", "The page has very few internal links.", "Link to your other key pages from this one.");
  if (extras?.robots !== undefined) add("SEO", 1, extras.robots ? "pass" : "warn", "No robots.txt file was found.", "Add a robots.txt that points to your sitemap.");
  if (extras?.sitemap !== undefined) add("SEO", 2, extras.sitemap ? "pass" : "warn", "No sitemap.xml was found, so search engines may miss pages.", "Generate a sitemap.xml and submit it in Google Search Console.");

  // ---- Accessibility
  if (images.length > 0) {
    const noAlt = images.filter(t => attr(t, "alt") === undefined).length;
    add("Accessibility", 3, noAlt === 0 ? "pass" : noAlt <= 2 ? "warn" : "fail", `${noAlt} image${noAlt === 1 ? " has" : "s have"} no alt text, so screen readers cannot describe them.`, "Add short, meaningful alt text to informative images, and empty alt (`alt=\"\"`) to decorative ones.", "Images have alt text.");
    const emptyAlt = images.filter(t => attr(t, "alt") !== undefined && attr(t, "alt")!.trim() === "" && !/role\s*=\s*["']presentation/i.test(t)).length;
    add("Accessibility", 1, emptyAlt > images.length * 0.6 && images.length > 2 ? "warn" : "pass", "Most images have empty alt text.", "Describe the images that carry meaning.");
  }
  add("Accessibility", 3, /<html\b[^>]*\slang\s*=/i.test(html) ? "pass" : "fail", "The page language is not set, so screen readers may pronounce it wrongly.", "Set `<html lang=\"en\">` (or `en-ZA`).");
  add("Accessibility", 3, viewport && /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(viewport) ? "fail" : "pass", "The page blocks pinch-to-zoom, which excludes people with low vision.", "Remove `user-scalable=no` and `maximum-scale=1` from the viewport tag.");
  add("Accessibility", 2, /<main\b|role\s*=\s*["']main["']/i.test(html) ? "pass" : "warn", "There is no <main> landmark for screen-reader users to jump to.", "Wrap the main content in a `<main>` element.");
  add("Accessibility", 1, /<(nav|header|footer)\b/i.test(html) ? "pass" : "warn", "The page does not use semantic nav, header or footer elements.", "Use `<header>`, `<nav>` and `<footer>` instead of generic divs.");
  const controls = [...tagsOf(html, "input"), ...tagsOf(html, "textarea"), ...tagsOf(html, "select")].filter(t => !/type\s*=\s*["']?(hidden|submit|button|image|reset)/i.test(t));
  if (controls.length > 0) {
    const unlabelled = controls.filter(t => !(attr(t, "aria-label") || attr(t, "aria-labelledby") || attr(t, "title") || (attr(t, "id") && new RegExp(`for\\s*=\\s*["']${attr(t, "id")}["']`, "i").test(html)))).length;
    add("Accessibility", 3, unlabelled === 0 ? "pass" : "fail", `${unlabelled} form field${unlabelled === 1 ? " has" : "s have"} no label.`, "Give each field a visible `<label for=\"…\">`.");
  }
  const emptyLinks = (html.match(/<a\b[^>]*>\s*<\/a>/gi) ?? []).filter(t => !/aria-label/i.test(t)).length;
  add("Accessibility", 2, emptyLinks === 0 ? "pass" : "warn", `${emptyLinks} link${emptyLinks === 1 ? " has" : "s have"} no text.`, "Give every link readable text or an aria-label.");
  const vague = links.length ? (html.match(/<a\b[^>]*>\s*(click here|here|read more|more|link)\s*<\/a>/gi) ?? []).length : 0;
  add("Accessibility", 1, vague === 0 ? "pass" : "warn", `${vague} link${vague === 1 ? " uses" : "s use"} vague text like “click here”.`, "Write link text that says where the link goes.");
  add("Accessibility", 2, tableCount >= 2 && !/<th\b/i.test(html) ? "fail" : "pass", "Tables are used for layout without header cells.", "Use CSS (grid or flexbox) for layout and keep tables for data.");
  add("Accessibility", 2, /<(marquee|blink)\b/i.test(html) ? "fail" : "pass", "Moving or blinking content cannot be paused.", "Remove marquee and blink elements.");
  const contrast = lowContrast(allCss, html);
  if (contrast.pairs > 0) add("Accessibility", 3, contrast.failing === 0 ? "pass" : contrast.failing <= 2 ? "warn" : "fail", `${contrast.failing} of ${contrast.pairs} text and background colour pairs fail the minimum contrast (worst ${contrast.worst?.toFixed(1)}:1, needs 4.5:1).`, "Darken the text or lighten the background until contrast is at least 4.5:1 (3:1 for large text).", "Text colours have enough contrast.");

  // ---- Best practices
  add("Best Practices", 3, viewport ? "pass" : "fail", "The page is not responsive: there is no viewport meta tag, so phones show a tiny desktop layout.", "Add the viewport meta tag and make the layout flexible.");
  add("Best Practices", 3, hasMediaQueries ? "pass" : "warn", "No responsive CSS (media queries) was found.", "Add media queries so the layout adapts to phones and tablets.");
  add("Best Practices", 2, /^\s*<!doctype html/i.test(html) ? "pass" : "fail", "The page has no `<!DOCTYPE html>`, so browsers use old compatibility mode.", "Start the page with `<!DOCTYPE html>`.");
  add("Best Practices", 1, tagsOf(html, "meta").some(t => attr(t, "charset") || /charset/i.test(attr(t, "content") ?? "")) || /charset/i.test(h["content-type"] ?? "") ? "pass" : "warn", "The character set is not declared.", "Add `<meta charset=\"utf-8\">`.");
  add("Best Practices", 1, tagsOf(html, "link").some(t => /icon/i.test(attr(t, "rel") ?? "")) ? "pass" : "warn", "There is no favicon, so browser tabs and bookmarks look unfinished.", "Add a favicon and an Apple touch icon.");
  add("Best Practices", 3, https ? "pass" : "fail", "The site is not served over HTTPS.", "Serve the whole site over HTTPS.");
  add("Best Practices", 3, deprecated === 0 ? "pass" : deprecated <= 3 ? "warn" : "fail", `${deprecated} outdated HTML features are used (font, center, marquee, bgcolor, align…).`, "Replace them with modern CSS.");
  add("Best Practices", 3, tableCount >= 3 ? "fail" : tableCount >= 1 ? "warn" : "pass", `${tableCount} table${tableCount === 1 ? " is" : "s are"} on the page, often a sign of table-based layout.`, "Use CSS grid or flexbox for layout.");
  add("Best Practices", 2, /document\.write\s*\(/i.test(html) ? "fail" : "pass", "The page uses document.write, which blocks loading.", "Replace document.write with normal DOM methods.");
  add("Best Practices", 2, /<(embed|object|applet)\b/i.test(html) || /\.swf\b/i.test(html) ? "fail" : "pass", "Flash or plug-in content is used, which browsers no longer support.", "Replace it with HTML5 video, audio or images.");
  add("Best Practices", 1, links.filter(t => attr(t, "target")?.toLowerCase() === "_blank" && !/noopener|noreferrer/i.test(attr(t, "rel") ?? "")).length === 0 ? "pass" : "warn", "Links that open in a new tab are missing rel=\"noopener\".", "Add `rel=\"noopener noreferrer\"` to those links.");
  add("Best Practices", 2, /under construction|coming soon|lorem ipsum|your text here|click to edit/i.test(text) ? "fail" : "pass", "The page has placeholder text (such as “under construction” or “lorem ipsum”).", "Replace placeholder text with real content.");
  add("Best Practices", 2, inlineStyles > 60 ? "fail" : "pass", `${inlineStyles} inline styles make the page hard to maintain.`, "Keep styling in a stylesheet.");

  // ---- Brand & design
  const cssLength = allCss.replace(/\s+/g, "").length;
  add("Brand & Design", 3, cssLength >= 1500 || inlineStyles > 40 ? "pass" : cssLength >= 400 ? "warn" : "fail", cssLength < 400 && inlineStyles <= 40 ? "The page has almost no styling, so it shows in the browser's plain default look." : "The page has very little styling.", "Design the page with a proper stylesheet: typography, colours, spacing and layout.", "The page has a real design system behind it.");
  const fonts = fontFamilies(allCss, html);
  const webFont = /fonts\.googleapis|fonts\.gstatic|use\.typekit|@font-face|\.woff2?/i.test(`${html}${allCss}`);
  add("Brand & Design", 3, fonts.length === 0 ? "fail" : fonts.length <= 3 ? "pass" : fonts.length === 4 ? "warn" : "fail", fonts.length === 0 ? "No typography is defined, so text uses the browser's default font (Times New Roman)." : `${fonts.length} different font families are used (${fonts.slice(0, 5).join(", ")}). Good brands use two or three.`, "Choose one heading font and one body font, and use them everywhere.", `Typography is controlled (${fonts.slice(0, 3).join(", ")}).`);
  add("Brand & Design", 1, webFont || fonts.length === 0 ? (fonts.length === 0 ? "na" : "pass") : "warn", "Only system fonts are used, so the brand typeface will not show consistently.", "Load a brand typeface through a web font service or self-hosted font files.");
  const palette = paletteOf(allCss, html);
  add("Brand & Design", 2, palette.length === 0 ? "na" : palette.length <= 8 ? "pass" : palette.length <= 14 ? "warn" : "fail", `${palette.length} distinct colours are used, which looks inconsistent. A brand palette is usually 3 to 6 colours.`, "Define a palette of one primary, one accent and a few neutrals, and reuse them.", "The colour palette is controlled.");
  add("Brand & Design", 1, /--[a-z0-9-]+\s*:/i.test(allCss) ? "pass" : "warn", "No design tokens (CSS variables) are used, so colours and spacing are repeated by hand.", "Define colours, spacing and type sizes as CSS custom properties.");
  const bodySize = /(?:^|[}\s])(?:body|html)\s*\{[^}]*font-size\s*:\s*(\d+(?:\.\d+)?)px/i.exec(allCss)?.[1];
  add("Brand & Design", 2, bodySize && Number(bodySize) < 15 ? "warn" : "pass", `The base text size is ${bodySize}px, which is hard to read on phones.`, "Use a base font size of at least 16px.");
  add("Brand & Design", 1, /line-height\s*:/i.test(allCss) ? "pass" : "warn", "Line height is not set, so paragraphs may look cramped.", "Set a line-height of about 1.5 for body text.");
  const sizes = new Set([...allCss.matchAll(/font-size\s*:\s*([\d.]+(?:px|rem|em))/gi)].map(m => m[1]));
  add("Brand & Design", 1, sizes.size <= 12 ? "pass" : "warn", `${sizes.size} different font sizes are used, which weakens the visual hierarchy.`, "Use a type scale of five or six sizes.");
  const levels = [...html.matchAll(/<h([1-6])\b/gi)].map(m => Number(m[1]));
  add("Brand & Design", 2, levels.length === 0 ? "warn" : levels.some((l, i) => i > 0 && l - levels[i - 1] > 1) ? "warn" : "pass", levels.length === 0 ? "The page has no headings, so there is no visual hierarchy." : "Heading levels skip (for example h1 straight to h3).", "Keep headings in order: h1, then h2, then h3.");
  const header = /<(header|nav)\b[\s\S]*?<\/(header|nav)>/i.exec(html)?.[0] ?? "";
  add("Brand & Design", 2, /logo/i.test(header) || /<img[^>]+(logo|brand)/i.test(html) || /<svg[^>]*(logo|brand)/i.test(html) ? "pass" : "warn", "No logo was found in the page header.", "Place your logo at the top left, linked to the home page.", "A logo is present in the header.");
  add("Brand & Design", 2, images.length + (html.match(/<svg\b/gi) ?? []).length + (/background(?:-image)?\s*:[^;]*url\(/i.test(allCss) ? 1 : 0) > 0 ? "pass" : "fail", "The page has no imagery at all, which makes it feel plain and untrustworthy.", "Add professional photography or illustration that shows your work, team or product.");
  add("Brand & Design", 2, /display\s*:\s*(flex|grid)/i.test(allCss) ? "pass" : tableCount > 0 ? "fail" : "warn", "Modern layout (flexbox or grid) is not used, so alignment and spacing are likely uneven.", "Rebuild the layout with CSS grid or flexbox.");
  add("Brand & Design", 1, /(padding|margin)\s*:/i.test(allCss) ? "pass" : "warn", "No spacing (padding or margin) is defined, so content is likely to feel crowded.", "Add generous, consistent spacing between sections.");
  add("Brand & Design", 2, /<button\b|class\s*=\s*["'][^"']*\b(btn|button)\b/i.test(html) ? "pass" : "warn", "No styled buttons were found, so actions are not visually clear.", "Style your main action as a clear button.");
  add("Brand & Design", 1, /transition|animation|transform/i.test(allCss) ? "pass" : "warn", "There are no hover or transition effects, so the page feels static.", "Add subtle hover and transition effects to links and buttons.");

  // ---- Content & conversion
  const ctaWords = /(contact|get started|get a quote|quote|book|call us|call now|enquir|inquir|schedule|request|sign up|subscribe|buy|order|shop|start|talk to|speak to|whatsapp|free)/i;
  const ctaCount = anchorTexts.filter(t => t && t.length < 40 && ctaWords.test(t)).length + (html.match(/<button\b[^>]*>[^<]*(contact|get|book|send|submit|quote|start)[^<]*</gi) ?? []).length;
  add("Content & Conversion", 3, ctaCount >= 2 ? "pass" : ctaCount === 1 ? "warn" : "fail", ctaCount === 0 ? "There is no clear call to action, so visitors do not know what to do next." : "There is only one call to action.", "Add a clear button such as “Get a quote” or “Book a call” near the top and again at the bottom.", "Clear calls to action are present.");
  const phone = /(\+27|\(?0\d{2}\)?)[\s-]?\d{3}[\s-]?\d{4}/.test(text) || hrefs.some(x => x.startsWith("tel:"));
  const email = hrefs.some(x => x.startsWith("mailto:")) || /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const form = /<form\b/i.test(html) && /<(textarea|input[^>]+type\s*=\s*["']?email)/i.test(html);
  add("Content & Conversion", 3, phone || email || form ? "pass" : "fail", "No contact details were found (phone, email or a contact form).", "Show a phone number, email address or contact form clearly on the page.", "Contact details are easy to find.");
  if (phone) add("Content & Conversion", 1, hrefs.some(x => x.startsWith("tel:")) ? "pass" : "warn", "The phone number is not tap-to-call on phones.", "Wrap the number in `<a href=\"tel:+27…\">`.");
  add("Content & Conversion", 2, form ? "pass" : "warn", "There is no enquiry form, so visitors must leave the page to contact you.", "Add a short enquiry form (name, email, message).");
  add("Content & Conversion", 2, /testimonial|reviews?\b|trusted by|clients say|rated|\bstars?\b|case stud|portfolio|our work|partners?\b|projects/i.test(text) ? "pass" : "warn", "There is no social proof (testimonials, reviews, client logos or case studies).", "Add testimonials, reviews or a short case study to build trust.", "The page shows social proof.");
  add("Content & Conversion", 1, hrefs.some(x => /about|our-story|team|who-we-are/.test(x)) || anchorTexts.some(t => /about|our story|team/.test(t)) ? "pass" : "warn", "There is no About page or section, so visitors cannot learn who is behind the business.", "Add an About section with your story and photos of the team.");
  add("Content & Conversion", 2, hrefs.some(x => /privacy|popia|terms|cookie/.test(x)) || anchorTexts.some(t => /privacy|popia|terms|cookie/.test(t)) ? "pass" : "warn", "There is no privacy policy or terms link. In South Africa POPIA expects one wherever personal details are collected.", "Publish a privacy policy (POPIA) and terms, and link them in the footer.");
  add("Content & Conversion", 1, hrefs.some(x => /facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com\/|youtube\.com|tiktok\.com|wa\.me|whatsapp/.test(x)) ? "pass" : "warn", "No social media or WhatsApp links were found.", "Link your active social profiles and WhatsApp in the footer.");
  const h1text = textOf(html, "h1") ?? "";
  add("Content & Conversion", 2, h1text.length >= 15 && h1text.length <= 90 ? "pass" : "warn", h1text ? `The main headline (“${h1text.slice(0, 50)}${h1text.length > 50 ? "…" : ""}”) is ${h1text.length < 15 ? "too short to explain the offer" : "too long to read at a glance"}.` : "There is no main headline stating what the business does.", "Write one clear headline that says what you do, for whom, and the benefit.", "The headline is clear.");
  const year = Math.max(0, ...[...text.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d\d)/gi)].map(m => Number(m[1])));
  add("Content & Conversion", 1, year === 0 ? "na" : year >= now.getFullYear() - 1 ? "pass" : "warn", `The footer says © ${year}, which makes the site look abandoned.`, "Update the copyright year, or use the current year automatically.");
  const sentences = text.split(/[.!?]+\s/).filter(s => s.split(" ").length > 2);
  const avg = sentences.length ? words / sentences.length : 0;
  if (words > 80) add("Content & Conversion", 1, avg <= 22 ? "pass" : avg <= 28 ? "warn" : "fail", `Sentences average ${avg.toFixed(0)} words, which is hard to read on screen.`, "Aim for sentences of 15 to 20 words and short paragraphs.");
  return out;
}

/* ---------------------------------------------------------------- scoring */

export function scoreChecks(checks: Check[]): { scores: Partial<Record<AuditCategory, number>>; passed: number; total: number } {
  const scores: Partial<Record<AuditCategory, number>> = {};
  for (const category of CATEGORIES) {
    const own = checks.filter(c => c.category === category && c.result !== "na");
    if (own.length === 0) continue;
    const total = own.reduce((s, c) => s + c.weight, 0);
    const earned = own.reduce((s, c) => s + c.weight * (c.result === "pass" ? 1 : c.result === "warn" ? 0.4 : 0), 0);
    // Squaring the ratio punishes real problems instead of letting many trivial passes hide them.
    scores[category] = Math.round(100 * Math.pow(earned / total, 1.8));
    // A site with a high-weight failure cannot score in the 90s for that area.
    if (own.some(c => c.result === "fail" && c.weight === 3)) scores[category] = Math.min(scores[category]!, 79);
  }
  const live = checks.filter(c => c.result !== "na");
  return { scores, passed: live.filter(c => c.result === "pass").length, total: live.length };
}

const ORDER = { High: 0, Medium: 1, Low: 2 } as const;
export const bySeverity = (a: AuditFinding, b: AuditFinding) => ORDER[a.severity] - ORDER[b.severity];

export function findingsFrom(checks: Check[]): AuditFinding[] {
  const step = (weight: 1 | 2 | 3): Severity => (weight === 3 ? "High" : weight === 2 ? "Medium" : "Low");
  const downgrade = (s: Severity): Severity => (s === "High" ? "Medium" : "Low");
  return checks
    .filter(c => c.result === "warn" || c.result === "fail")
    .map(c => ({ category: c.category, severity: c.result === "warn" ? downgrade(step(c.weight)) : step(c.weight), message: c.message, fix: c.fix, verify: VERIFY[c.category] }))
    .sort(bySeverity);
}

/** What the page already does well, from checks that passed and describe a strength. */
export function strengthsFrom(checks: Check[]): string[] {
  return checks.filter(c => c.result === "pass" && c.good).map(c => c.good!).slice(0, 6);
}

export function average(scores: Partial<Record<AuditCategory, number>>): number {
  const values = CATEGORIES.map(c => scores[c]).filter((v): v is number => typeof v === "number");
  return values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
}

/** Quick check, used when no PageSpeed key is configured or Google is unavailable. */
export function analyze(input: AuditInput & { url: string }, now = new Date(), notice?: string): AuditResult {
  const checks = [...contentChecks(input, now), ...securityChecks(input)];
  const { scores, passed, total } = scoreChecks(checks);
  const full = Object.fromEntries(CATEGORIES.map(c => [c, scores[c] ?? 0])) as Record<AuditCategory, number>;
  return {
    url: input.url, finalUrl: input.finalUrl, auditedAt: now.toISOString(), source: "quick", notice,
    overall: average(full), scores: full, findings: findingsFrom(checks), strengths: strengthsFrom(checks), passed, total,
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
