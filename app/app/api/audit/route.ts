import { NextResponse } from "next/server";
import { analyze, average, findingsFrom, scoreChecks, securityChecks } from "@/_lib/audit";
import type { AuditCategory, AuditExtras, AuditResult } from "@/_lib/audit";
import { runPageSpeed } from "@/_lib/pagespeed";
import { checkPublicUrl } from "@/_lib/url-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;
const UA = "OakPixelAudit/1.0 (+https://www.oakandpixel.co.za)";

async function readLimited(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
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
      response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs), cache: "no-store", headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" } });
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

export async function POST(request: Request) {
  let body: { url?: unknown } = {};
  try { body = await request.json(); } catch { /* handled below */ }
  const input = typeof body.url === "string" ? body.url : "";

  const checked = await checkPublicUrl(input);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  const key = process.env.PAGESPEED_API_KEY ?? "";
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

  // Run the extra probes and (when configured) Google's Lighthouse at the same time.
  const [redirect, robots, sitemap, lighthouse] = await Promise.all([
    httpRedirects(finalUrl.hostname),
    exists(finalUrl.origin, "/robots.txt"),
    exists(finalUrl.origin, "/sitemap.xml"),
    key ? runPageSpeed(finalUrl.toString(), key) : Promise.resolve(null),
  ]);
  const extras: AuditExtras = { httpRedirectsToHttps: redirect, robots, sitemap };
  const auditInput = { url: input.trim(), finalUrl: finalUrl.toString(), html, headers, responseMs, extras };

  let result: AuditResult;
  if (lighthouse) {
    const security = securityChecks(auditInput);
    const secured = scoreChecks(security);
    const scores = { ...lighthouse.scores, Security: secured.scores.Security } as Record<AuditCategory, number>;
    result = {
      url: auditInput.url, finalUrl: auditInput.finalUrl, auditedAt: new Date().toISOString(), source: "lighthouse",
      overall: average(scores), scores, metrics: lighthouse.metrics,
      findings: [...lighthouse.findings, ...findingsFrom(security)].sort((a, b) => ["High", "Medium", "Low"].indexOf(a.severity) - ["High", "Medium", "Low"].indexOf(b.severity)),
      passed: lighthouse.passed + secured.passed, total: lighthouse.total + secured.total,
      responseMs: Math.round(responseMs), htmlBytes: Buffer.byteLength(html),
    };
  } else {
    const notice = key
      ? "Google PageSpeed was unavailable just now, so this is the built-in quick check."
      : "Quick check only. Add a PageSpeed API key in Vercel for full Lighthouse scores.";
    result = analyze(auditInput, new Date(), notice);
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
