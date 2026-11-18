import { NextResponse } from "next/server";
import { analyze } from "@/_lib/audit";
import { checkPublicUrl } from "@/_lib/url-guard";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;

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

export async function POST(request: Request) {
  let body: { url?: unknown } = {};
  try { body = await request.json(); } catch { /* handled below */ }
  const input = typeof body.url === "string" ? body.url : "";

  let checked = await checkPublicUrl(input);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  const started = performance.now();
  let current = checked.url;
  let response: Response | undefined;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      response = await fetch(current, {
        redirect: "manual", signal: AbortSignal.timeout(12_000), cache: "no-store",
        headers: { "User-Agent": "OakPixelAudit/1.0 (+https://www.oakandpixel.co.za)", Accept: "text/html,application/xhtml+xml" },
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        void response.body?.cancel().catch(() => undefined);
        checked = await checkPublicUrl(new URL(location, current).toString());
        if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
        current = checked.url;
        response = undefined;
        continue;
      }
      break;
    }
  } catch {
    return NextResponse.json({ error: "The website did not respond in time, or refused the connection." }, { status: 502 });
  }
  if (!response) return NextResponse.json({ error: "The website redirected too many times." }, { status: 502 });
  const responseMs = performance.now() - started;
  if (!/html/i.test(response.headers.get("content-type") ?? "")) return NextResponse.json({ error: "That address did not return a web page." }, { status: 422 });
  if (response.status >= 400) return NextResponse.json({ error: `The website answered with an error (${response.status}).` }, { status: 502 });

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => { headers[key] = value; });
  const html = await readLimited(response);
  const result = analyze({ url: input.trim(), finalUrl: current.toString(), html, headers, responseMs });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
