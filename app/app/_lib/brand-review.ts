import { VERIFY } from "@/_lib/audit";
import type { AuditFinding, BrandReview, Severity } from "@/_lib/audit";

/**
 * AI design review of the page. Needs ANTHROPIC_API_KEY. The page screenshot (when Lighthouse supplied one)
 * and a short summary of the page are sent to Claude, which rates the visual design and recommends fixes.
 * Without a key the Brand & Design score still comes from the measurable checks.
 */
export type BrandReviewResult = { review: BrandReview; findings: AuditFinding[]; score: number };

const RATING_LABELS = ["Visual design", "Typography", "Colour", "Imagery", "Layout and spacing", "Brand clarity"] as const;
const MODEL = "claude-sonnet-5-5";

const clean = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Validate the model's JSON; anything malformed is dropped rather than trusted. */
export function parseBrandReview(raw: string): BrandReviewResult | null {
  const json = /\{[\s\S]*\}/.exec(raw.replace(/```(?:json)?/g, ""))?.[0];
  if (!json) return null;
  let data: { summary?: unknown; strengths?: unknown; ratings?: unknown; issues?: unknown };
  try { data = JSON.parse(json); } catch { return null; }
  const ratings = RATING_LABELS.flatMap(label => {
    const found = Array.isArray(data.ratings) ? (data.ratings as { label?: unknown; score?: unknown }[]).find(r => r.label === label) : undefined;
    const score = typeof found?.score === "number" ? Math.round(found.score) : NaN;
    return Number.isFinite(score) && score >= 0 && score <= 100 ? [{ label, score }] : [];
  });
  if (ratings.length < 3) return null;
  const sev = (value: unknown): Severity => (value === "High" || value === "Medium" || value === "Low" ? value : "Medium");
  const findings: AuditFinding[] = (Array.isArray(data.issues) ? (data.issues as Record<string, unknown>[]) : []).slice(0, 8).flatMap(issue => {
    const message = clean(issue.observation, 280);
    const fix = clean(issue.recommendation, 280);
    return message && fix ? [{ category: "Brand & Design" as const, severity: sev(issue.severity), message, fix, verify: VERIFY["Brand & Design"] }] : [];
  });
  const strengths = (Array.isArray(data.strengths) ? data.strengths : []).map(s => clean(s, 200)).filter(Boolean).slice(0, 4);
  const score = Math.round(ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length);
  return { review: { summary: clean(data.summary, 600), strengths, ratings }, findings, score };
}

export async function runBrandReview(args: { url: string; title?: string; headings: string[]; text: string; palette: string[]; fonts: string[]; screenshot?: string }, key: string): Promise<BrandReviewResult | null> {
  const prompt = `You are a senior brand and UI/UX designer reviewing a small-business website for a web agency in South Africa. Be honest and specific: if the design looks dated, cluttered, unbalanced or unprofessional, say so and score it low. Do not flatter.

Page: ${args.url}
Title: ${args.title ?? "(none)"}
Headings: ${args.headings.slice(0, 12).join(" | ") || "(none)"}
Colours found (approximate RGB): ${args.palette.slice(0, 12).join("; ") || "(none)"}
Fonts found: ${args.fonts.slice(0, 6).join(", ") || "(none declared)"}
Opening text: ${args.text.slice(0, 900)}
${args.screenshot ? "A mobile screenshot of the first screen is attached." : "No screenshot is available, so judge from the details above and say where that limits you."}

Reply with JSON only, in this exact shape:
{"summary":"2-3 sentence overall verdict on how the site looks and feels",
"strengths":["up to 4 short strengths"],
"ratings":[{"label":"Visual design","score":0},{"label":"Typography","score":0},{"label":"Colour","score":0},{"label":"Imagery","score":0},{"label":"Layout and spacing","score":0},{"label":"Brand clarity","score":0}],
"issues":[{"severity":"High|Medium|Low","observation":"what is wrong","recommendation":"the specific fix"}]}
Scores are 0 to 100 (50 is average for a small business site). Give at most 6 issues, most serious first.`;

  const content: unknown[] = [];
  const image = args.screenshot ? /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(args.screenshot) : null;
  if (image) content.push({ type: "image", source: { type: "base64", media_type: image[1], data: image[2] } });
  content.push({ type: "text", text: prompt });
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: "user", content }] }),
      signal: AbortSignal.timeout(40_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? []).filter(part => part.type === "text").map(part => part.text ?? "").join("");
    return parseBrandReview(text);
  } catch {
    return null;
  }
}
