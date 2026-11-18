import { NextResponse } from "next/server";
import { CLIENT_RENDERED_NOTICE, analyze, average, bySeverity, contentChecks, findingsFrom, fontFamilies, isClientRendered, paletteOf, scoreChecks, securityChecks, strengthsFrom } from "@/_lib/audit";
import type { AuditCategory, AuditExtras, AuditInput, AuditResult } from "@/_lib/audit";
import { runBrandReview } from "@/_lib/brand-review";
import { runPageSpeed } from "@/_lib/pagespeed";
import { checkPublicUrl } from "@/_lib/url-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 1_500_000;
const MAX_CSS_BYTES = 250_000;
const MAX_REDIRECTS = 4;
const UA = "OakPixelAudit/1.0 (+https://www.oakandpixel.co.za)";

async function readLimited(response: Response, limit = MAX_BYTES): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < limit) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.length;
  }
  void reader.cancel().catch(() => undefined);
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

/** Fetch a public URL, re-checking every redirect hop against the public-address guard. */
async function guardedFetch(start: URL, timeoutMs: number, follow = true): Promise<{ response: Response; url: URL } | { error: string; status: number }> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let response: Response;
    try {
      response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs), cache: "no-store", headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,text/css,*/*" } });
    } catch {
      return { error: "The website did not respond in time, or refused the connection.", status: 502 };
    }
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location && follow) {
      void response.body?.cancel().catch(() => undefined);
      const next = await checkPublicUrl(new URL(location, current).toString());
      if (!next.ok) return { error: next.error, status: 400 };
      current = next.url;
      continue;
    }
    return { response, url: current };
  }
  return { error: "The website redirected too many times.", status: 502 };
}

/** True when the path answers 200 with something that is not an HTML error page. */
async function exists(origin: string, path: string): Promise<boolean | undefined> {
  const target = await checkPublicUrl(origin + path);
  if (!target.ok) return undefined;
  const result = await guardedFetch(target.url, 6000);
  if ("error" in result) return undefined;
  void result.response.body?.cancel().catch(() => undefined);
  return result.response.status === 200 && !/html/i.test(result.response.headers.get("content-type") ?? "");
}

async function httpRedirects(host: string): Promise<boolean | undefined> {
  const target = await checkPublicUrl(`http://${host}/`);
  if (!target.ok) return undefined;
  const result = await guardedFetch(target.url, 6000, false);
  if ("error" in result) return undefined;
  void result.response.body?.cancel().catch(() => undefined);
  return /^https:\/\//i.test(result.response.headers.get("location") ?? "");
}

/** The page's linked stylesheets (up to five), so design checks can read colours, fonts and layout rules. */
async function fetchStylesheets(html: string, base: URL): Promise<string> {
  const hrefs = (html.match(/<link\b[^>]*>/gi) ?? [])
    .filter(tag => /rel\s*=\s*["']?stylesheet/i.test(tag))
    .map(tag => /href\s*=\s*(?:"([^"]+)"|'([^']+)')/i.exec(tag))
    .flatMap(match => (match ? [match[1] ?? match[2]] : []))
    .slice(0, 5);
  const parts = await Promise.all(hrefs.map(async href => {
    try {
      const target = await checkPublicUrl(new URL(href, base).toString());
      if (!target.ok) return "";
      const result = await guardedFetch(target.url, 6000);
      if ("error" in result || result.response.status !== 200) return "";
      return await readLimited(result.response, MAX_CSS_BYTES);
    } catch { return ""; }
  }));
  return parts.join("\n");
}

const headingsOf = (html: string) => [...html.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map(m => m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
const plainText = (html: string) => html.replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

export async function POST(request: Request) {
  let body: { url?: unknown; client?: unknown } = {};
  try { body = await request.json(); } catch { /* handled below */ }
  const input = typeof body.url === "string" ? body.url : "";
  const preparedFor = typeof body.client === "string" ? body.client.replace(/\s+/g, " ").trim().slice(0, 80) || undefined : undefined;

  const checked = await checkPublicUrl(input);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  const pageSpeedKey = process.env.PAGESPEED_API_KEY ?? "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const started = performance.now();
  const page = await guardedFetch(checked.url, 12_000);
  if ("error" in page) return NextResponse.json({ error: page.error }, { status: page.status });
  const { response, url: finalUrl } = page;
  const responseMs = performance.now() - started;
  if (!/html/i.test(response.headers.get("content-type") ?? "")) return NextResponse.json({ error: "That address did not return a web page." }, { status: 422 });
  if (response.status >= 400) return NextResponse.json({ error: `The website answered with an error (${response.status}).` }, { status: 502 });

  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => { headers[name] = value; });
  const html = await readLimited(response);

  // Run the extra probes, the stylesheets and (when configured) Google's Lighthouse at the same time.
  const [redirect, robots, sitemap, css, lighthouse] = await Promise.all([
    httpRedirects(finalUrl.hostname),
    exists(finalUrl.origin, "/robots.txt"),
    exists(finalUrl.origin, "/sitemap.xml"),
    fetchStylesheets(html, finalUrl),
    pageSpeedKey ? runPageSpeed(finalUrl.toString(), pageSpeedKey) : Promise.resolve(null),
  ]);
  const extras: AuditExtras = { httpRedirectsToHttps: redirect, robots, sitemap };
  const auditInput: AuditInput & { url: string } = { url: input.trim(), finalUrl: finalUrl.toString(), html, headers, responseMs, extras, css };
  const now = new Date();

  const ai = anthropicKey
    ? await runBrandReview({ url: auditInput.finalUrl, title: /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim(), headings: headingsOf(html), text: plainText(html), palette: paletteOf(css, html), fonts: fontFamilies(css, html), screenshot: lighthouse?.screenshot }, anthropicKey)
    : null;

  let result: AuditResult;
  if (lighthouse) {
    // Lighthouse supplies four areas; our own checks supply Security, Brand & Design and Content & Conversion.
    const own = [...contentChecks(auditInput, now), ...securityChecks(auditInput)].filter(c => ["Security", "Brand & Design", "Content & Conversion"].includes(c.category));
    const scored = scoreChecks(own);
    const scores = { ...lighthouse.scores, ...scored.scores } as Record<AuditCategory, number>;
    result = {
      url: auditInput.url, finalUrl: auditInput.finalUrl, auditedAt: now.toISOString(), source: "lighthouse",
      overall: 0, scores, metrics: lighthouse.metrics, screenshot: lighthouse.screenshot,
      findings: [...lighthouse.findings, ...findingsFrom(own)], strengths: [...lighthouse.strengths, ...strengthsFrom(own)].slice(0, 8),
      passed: lighthouse.passed + scored.passed, total: lighthouse.total + scored.total,
      responseMs: Math.round(responseMs), htmlBytes: Buffer.byteLength(html),
    };
  } else {
    const notice = pageSpeedKey
      ? "Google PageSpeed was unavailable just now, so performance, accessibility, SEO and best practices use the built-in quick check."
      : "Quick check only. Add a PageSpeed API key in Vercel for full Lighthouse scores.";
    result = analyze(auditInput, now, notice);
  }

  if (ai) {
    const brand = result.scores["Brand & Design"];
    result.scores["Brand & Design"] = Math.round(brand * 0.5 + ai.score * 0.5);
    result.findings = [...result.findings, ...ai.findings];
    result.strengths = [...result.strengths, ...ai.review.strengths].slice(0, 8);
    result.brandReview = ai.review;
  } else if (!anthropicKey) {
    result.notice = [result.notice, "Add an Anthropic API key to include an AI design review of how the site looks."].filter(Boolean).join(" ");
  }
  if (isClientRendered(html)) {
    result.notice = [CLIENT_RENDERED_NOTICE, result.notice].filter(Boolean).join(" ");
    // Praise for content or design would be a guess about a page the audit could not see.
    result.strengths = result.strengths.filter(s => /https|server responds|hsts|redirects|compression/i.test(s));
  }
  result.findings.sort(bySeverity);
  result.overall = average(result.scores);
  result.preparedFor = preparedFor;
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
