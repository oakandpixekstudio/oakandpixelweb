"use client";

import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import { BrandMark } from "@/_components/shared";
import { CATEGORIES, FOCUS, VERIFY, verdict } from "@/_lib/audit";
import type { AuditFinding, AuditResult, Severity } from "@/_lib/audit";

const tone = (score: number) => (score >= 90 ? "good" : score >= 75 ? "fair" : score >= 50 ? "mid" : "bad");
const TAGLINE = (score: number) => (score >= 90 ? "A strong foundation. Clear next steps." : score >= 75 ? "A solid base with clear room to grow." : score >= 50 ? "Real opportunities to win more business." : "Important problems are costing you enquiries.");

const COVERAGE: Record<string, string> = {
  Performance: "Page loading, server response and page weight.",
  SEO: "Discoverability, indexability and on-page metadata.",
  Security: "HTTPS and the security headers a browser can observe.",
  Accessibility: "Automated checks for inclusive access, including colour contrast.",
  "Best Practices": "Implementation hygiene and modern web conventions.",
  "Brand & Design": "Typography, colour, layout, spacing, logo and visual consistency.",
  "Content & Conversion": "Calls to action, contact details, trust signals and clarity of message.",
};

const dateOf = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

function Ring({ score, size = 150 }: { score: number; size?: number }) {
  const r = 62; const c = 2 * Math.PI * r;
  return <svg width={size} height={size} viewBox="0 0 150 150" role="img" aria-label={`Overall score ${score} out of 100`}>
    <circle cx="75" cy="75" r={r} fill="none" stroke="#e4ebe6" strokeWidth="12"/>
    <circle cx="75" cy="75" r={r} fill="none" className={`rp-ring ${tone(score)}`} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 75 75)"/>
    <text x="75" y="82" textAnchor="middle" className="rp-ring-text">{score}</text>
    <text x="75" y="102" textAnchor="middle" className="rp-ring-sub">out of 100</text>
  </svg>;
}

function FindingBlock({ finding, index }: { finding: AuditFinding; index: number }) {
  return <article className="rp-finding">
    <div className="rp-finding-head"><span className="rp-num">{String(index).padStart(2, "0")}</span><span className={`rp-sev ${finding.severity}`}>{finding.severity.toUpperCase()}</span><span className="rp-cat">{finding.category.toUpperCase()}</span></div>
    <p><b>OBSERVATION:</b> {finding.message}</p>
    {finding.fix && <p><b>RECOMMENDED ACTION:</b> {finding.fix}</p>}
    <p><b>HOW TO VERIFY:</b> {finding.verify ?? VERIFY[finding.category]}</p>
  </article>;
}

export function AuditReport({ result, previewing, onClose }: { result: AuditResult; previewing: boolean; onClose: () => void }) {
  if (typeof document === "undefined") return null;
  const v = verdict(result.overall);
  const ranked = [...CATEGORIES].sort((a, b) => result.scores[b] - result.scores[a]);
  const best = ranked[0]; const worst = ranked[ranked.length - 1];
  const high = result.findings.filter(f => f.severity === "High");
  const medium = result.findings.filter(f => f.severity === "Medium");
  const low = result.findings.filter(f => f.severity === "Low");
  const listed = [...high, ...medium, ...low.slice(0, 8)].slice(0, 36);
  const plan: [string, Severity, AuditFinding[]][] = [["NOW", "High", high.slice(0, 4)], ["NEXT", "Medium", medium.slice(0, 4)], ["LATER", "Low", low.slice(0, 3)]];
  const hasBrand = Boolean(result.brandReview);
  const n = (i: number) => String(i).padStart(2, "0");
  let section = 0;

  return createPortal(<div className={`audit-report-root ${previewing ? "preview" : ""}`} aria-hidden={!previewing}>
    <div className="rp-toolbar"><b>Report preview</b><span style={{ flex: 1 }}/><button type="button" className="rp-btn primary" onClick={() => window.print()}><Download size={15}/>Save as PDF</button><button type="button" className="rp-btn" onClick={onClose}><X size={15}/>Close</button></div>

    {/* ---------------------------------------------------------- cover */}
    <section className="rp-sheet rp-cover">
      <header className="rp-brandline"><BrandMark/><span>Oak &amp; Pixel Studio</span></header>
      <div className="rp-cover-main">
        <div className="rp-eyebrow">WEBSITE QUALITY REPORT</div>
        <h1>Website Audit Report</h1>
        <p className="rp-lede">A clear view of your website&apos;s technical health, design, content and the highest-value opportunities to win more business.</p>
        {result.preparedFor && <div className="rp-meta"><span>PREPARED FOR</span><b>{result.preparedFor}</b></div>}
        <div className="rp-meta"><span>WEBSITE REVIEWED</span><b>{result.finalUrl}</b></div>
        <div className="rp-meta"><span>REPORT DATE</span><b>{dateOf(result.auditedAt)}</b></div>
        <div className="rp-scorecard"><Ring score={result.overall} size={168}/><div><b className={`rp-verdict ${tone(result.overall)}`}>{v.label}</b><p>{TAGLINE(result.overall)}</p><small>{CATEGORIES.length} review areas • {high.length} high-priority {high.length === 1 ? "finding" : "findings"} • Action plan included</small></div></div>
        {result.screenshot && <figure className="rp-shot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.screenshot} alt="Screenshot of the website's first screen on a phone"/>
          <figcaption>The website on a phone</figcaption>
        </figure>}
      </div>
      <footer className="rp-coverfoot">Prepared by Oak &amp; Pixel Studio · www.oakandpixel.co.za</footer>
    </section>

    {/* ------------------------------------------------------- snapshot */}
    <section className="rp-sheet">
      <div className="rp-section-label">{n(++section)}. EXECUTIVE SNAPSHOT</div>
      <h2>Your website at a glance.</h2>
      <div className="rp-callout"><div><small>OVERALL / {result.overall} OF 100</small><h3>{v.label === "Great" ? "Excellent performance across the review areas." : v.label === "Good" ? "Good results, with clear opportunities." : v.label === "Needs work" ? "Several important issues are holding the website back." : "Serious problems need attention first."}</h3><p>{v.text} The strongest area is <b>{best}</b> ({result.scores[best]}) and the weakest is <b>{worst}</b> ({result.scores[worst]}). We found {high.length} high, {medium.length} medium and {low.length} low-priority {result.findings.length === 1 ? "finding" : "findings"}.</p></div><Ring score={result.overall} size={120}/></div>
      <h4 className="rp-h4">CATEGORY SCORECARD</h4>
      <table className="rp-table"><thead><tr><th>AREA</th><th>REVIEW FOCUS</th><th>SCORE</th><th>RESULT</th></tr></thead>
        <tbody>{CATEGORIES.map(c => <tr key={c}><td><b>{c}</b></td><td>{FOCUS[c]}</td><td className={`rp-score ${tone(result.scores[c])}`}>{result.scores[c]} / 100</td><td><span className="rp-bar"><i className={tone(result.scores[c])} style={{ width: `${result.scores[c]}%` }}/></span></td></tr>)}</tbody></table>
      {result.metrics && result.metrics.length > 0 && <><h4 className="rp-h4">LOADING EXPERIENCE (MOBILE)</h4><div className="rp-metrics">{result.metrics.map(m => <div key={m.label}><small>{m.label}</small><b className={m.rating}>{m.value}</b></div>)}</div></>}
      <h4 className="rp-h4">TOP PRIORITIES</h4>
      <ol className="rp-top">{result.findings.slice(0, 3).map((f, i) => <li key={i}><span className="rp-num">{n(i + 1)}</span><span className={`rp-sev ${f.severity}`}>{f.severity.toUpperCase()}</span><span>{f.message}</span></li>)}{result.findings.length === 0 && <li>No issues were found.</li>}</ol>
      {result.strengths.length > 0 && <><h4 className="rp-h4">WHAT IS ALREADY WORKING</h4><ul className="rp-strengths">{result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></>}
    </section>

    {/* --------------------------------------------------------- design */}
    {hasBrand && result.brandReview && <section className="rp-sheet">
      <div className="rp-section-label">{n(++section)}. BRAND &amp; DESIGN REVIEW</div>
      <h2>How the website looks and feels.</h2>
      <p className="rp-lead">{result.brandReview.summary}</p>
      <table className="rp-table"><thead><tr><th>DESIGN ELEMENT</th><th>SCORE</th><th>RESULT</th></tr></thead><tbody>{result.brandReview.ratings.map(r => <tr key={r.label}><td><b>{r.label}</b></td><td className={`rp-score ${tone(r.score)}`}>{r.score} / 100</td><td><span className="rp-bar"><i className={tone(r.score)} style={{ width: `${r.score}%` }}/></span></td></tr>)}</tbody></table>
      {result.brandReview.strengths.length > 0 && <><h4 className="rp-h4">DESIGN STRENGTHS</h4><ul className="rp-strengths">{result.brandReview.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></>}
      <p className="rp-note">Design ratings are an expert-style assessment of the first screen and the page&apos;s styling. They are a judgement, not a measurement, and should be confirmed in a design review.</p>
    </section>}

    {/* ------------------------------------------------------- findings */}
    <section className="rp-sheet rp-flow">
      <div className="rp-section-label">{n(++section)}. FINDINGS &amp; RECOMMENDATIONS</div>
      <h2>What to improve next.</h2>
      <p className="rp-lead">{listed.length === result.findings.length ? `All ${result.findings.length} findings` : `The ${listed.length} most important of ${result.findings.length} findings`}, most serious first. Each one says what we observed, what to do and how to confirm it worked.</p>
      {listed.map((f, i) => <FindingBlock key={i} finding={f} index={i + 1}/>)}
      {listed.length === 0 && <p className="rp-lead">No issues were found. Re-audit regularly to keep it that way.</p>}
    </section>

    {/* ------------------------------------------------------------ plan */}
    <section className="rp-sheet">
      <div className="rp-section-label">{n(++section)}. IMPROVEMENT PLAN</div>
      <h2>Turn findings into progress.</h2>
      <p className="rp-lead">A practical order of work. Start at the top: the biggest wins come first.</p>
      <table className="rp-table rp-plan"><thead><tr><th>PRIORITY</th><th>NEXT ACTION</th><th>SUCCESS CHECK</th></tr></thead>
        <tbody>{plan.flatMap(([label, severity, items]) => items.map((f, i) => <tr key={`${label}${i}`}><td><span className={`rp-sev ${severity}`}>{label}</span></td><td><b>{f.category}:</b> {f.fix ?? f.message}</td><td>{f.verify ?? VERIFY[f.category]}</td></tr>))}</tbody></table>
      {plan.every(([, , items]) => items.length === 0) && <p className="rp-lead">There is nothing to fix right now.</p>}
      <div className="rp-next"><h3>Want us to fix this for you?</h3><p>Oak &amp; Pixel Studio designs and builds fast, professional websites for South African businesses. Talk to us about turning this plan into results: <b>info@oakandpixel.co.za</b> · <b>www.oakandpixel.co.za</b></p></div>
    </section>

    {/* ------------------------------------------------------- coverage */}
    <section className="rp-sheet">
      <div className="rp-section-label">AUDIT COVERAGE</div>
      <h2>What the assessment covers.</h2>
      <div className="rp-cover-grid">{CATEGORIES.map(c => <div key={c}><b>{c}</b><p>{COVERAGE[c]}</p></div>)}</div>
      <div className="rp-section-label" style={{ marginTop: 28 }}>MEASUREMENT &amp; INTERPRETATION</div>
      <p className="rp-note">Tested URL: {result.finalUrl}. Scan date: {dateOf(result.auditedAt)}. Method: {result.source === "lighthouse" ? "Google Lighthouse (mobile) for performance, accessibility, SEO and best practices, plus Oak & Pixel checks for security, design and content." : "Oak & Pixel quick check of the page HTML, stylesheets, response headers and response time."} {result.passed} of {result.total} individual checks passed.</p>
      <p className="rp-note">Category scores are directional indicators and should not replace a full manual review. Security scores do not certify that a website is secure, and automated accessibility results do not establish full WCAG conformance. Only the home page address supplied was assessed. Re-audit after making changes and compare results under the same conditions.</p>
    </section>
  </div>, document.body);
}
