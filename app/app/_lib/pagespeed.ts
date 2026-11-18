import { VERIFY } from "@/_lib/audit";
import type { AuditCategory, AuditFinding, AuditMetric, Severity } from "@/_lib/audit";

/** Real Lighthouse results from Google PageSpeed Insights (mobile). Needs PAGESPEED_API_KEY. */
export type PageSpeedResult = {
  scores: Partial<Record<AuditCategory, number>>;
  findings: AuditFinding[];
  strengths: string[];
  metrics: AuditMetric[];
  screenshot?: string;
  passed: number;
  total: number;
};

const CATEGORY_MAP: Record<string, AuditCategory> = {
  performance: "Performance",
  accessibility: "Accessibility",
  seo: "SEO",
  "best-practices": "Best Practices",
};
const SCORED_MODES = new Set(["binary", "numeric", "metricSavings"]);

type Audit = { id: string; title: string; description?: string; score: number | null; scoreDisplayMode: string; displayValue?: string; details?: { data?: string } };
type Lighthouse = {
  categories: Record<string, { score: number | null; auditRefs: { id: string; weight: number }[] }>;
  audits: Record<string, Audit>;
};

const rate = (score: number | null): AuditMetric["rating"] => (score === null ? "ok" : score >= 0.9 ? "good" : score >= 0.5 ? "ok" : "bad");

/** Lighthouse descriptions are markdown with links: keep the first sentence as plain advice. */
export function plainAdvice(description: string | undefined): string | undefined {
  if (!description) return undefined;
  const text = description.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[`*_]/g, "").replace(/\s+/g, " ").trim();
  const first = text.split(/(?<=[.!?])\s+/)[0];
  return first && first.length > 8 ? first : undefined;
}

export function parsePageSpeed(data: { lighthouseResult?: Lighthouse }): PageSpeedResult | null {
  const lh = data.lighthouseResult;
  if (!lh?.categories || !lh.audits) return null;
  const scores: PageSpeedResult["scores"] = {};
  const findings: AuditFinding[] = [];
  const strengths: string[] = [];
  let passed = 0;
  let total = 0;
  for (const [key, category] of Object.entries(CATEGORY_MAP)) {
    const entry = lh.categories[key];
    if (!entry || entry.score === null) continue;
    scores[category] = Math.round(entry.score * 100);
    const failing: (AuditFinding & { weight: number })[] = [];
    for (const ref of entry.auditRefs) {
      const audit = lh.audits[ref.id];
      if (!audit || ref.weight <= 0 || audit.score === null || !SCORED_MODES.has(audit.scoreDisplayMode)) continue;
      total += 1;
      if (audit.score >= 0.9) {
        passed += 1;
        if (category === "Performance" && ref.weight >= 10 && audit.displayValue && strengths.length < 3) strengths.push(`${audit.title}: ${audit.displayValue.replace(/ /g, " ")}.`);
        continue;
      }
      const severity: Severity = audit.score < 0.5 ? (ref.weight >= 3 ? "High" : "Medium") : "Low";
      failing.push({ category, severity, weight: ref.weight, message: `${audit.title}${audit.displayValue ? ` (${audit.displayValue.replace(/ /g, " ")})` : ""}`, fix: plainAdvice(audit.description), verify: VERIFY[category] });
    }
    failing.sort((a, b) => b.weight - a.weight);
    findings.push(...failing.slice(0, 6).map(f => ({ category: f.category, severity: f.severity, message: f.message, fix: f.fix, verify: f.verify })));
  }
  const wanted: [string, string][] = [["first-contentful-paint", "First paint"], ["largest-contentful-paint", "Largest paint"], ["total-blocking-time", "Blocking time"], ["cumulative-layout-shift", "Layout shift"], ["speed-index", "Speed index"]];
  const metrics = wanted.flatMap(([id, label]) => { const a = lh.audits[id]; return a?.displayValue ? [{ label, value: a.displayValue.replace(/ /g, " "), rating: rate(a.score) }] : []; });
  const shot = lh.audits["final-screenshot"]?.details?.data;
  const screenshot = typeof shot === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(shot) ? shot : undefined;
  return Object.keys(scores).length === 0 ? null : { scores, findings, strengths, metrics, screenshot, passed, total };
}

export async function runPageSpeed(url: string, key: string): Promise<PageSpeedResult | null> {
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.set("key", key);
  for (const category of ["performance", "accessibility", "seo", "best-practices"]) endpoint.searchParams.append("category", category);
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(55_000), cache: "no-store" });
    if (!response.ok) return null;
    return parsePageSpeed(await response.json());
  } catch {
    return null;
  }
}
