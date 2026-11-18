"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Code2, Download, ExternalLink, Gauge, Info, Link2, Loader2, Play, Search, ShieldCheck, Accessibility } from "lucide-react";
import { PageHero, Panel } from "@/_components/shared";
import { CATEGORIES, verdict } from "@/_lib/audit";
import type { AuditCategory, AuditResult, Severity } from "@/_lib/audit";

const ICONS: Record<AuditCategory, typeof Gauge> = { Performance: Gauge, SEO: Search, Security: ShieldCheck, Accessibility, "Best Practices": Code2 };
const BLURB: Record<AuditCategory, string> = {
  Performance: "Load speed and page weight",
  SEO: "Search visibility and optimisation",
  Security: "HTTPS, headers and best practices",
  Accessibility: "Usability for all users (WCAG)",
  "Best Practices": "Modern web standards and setup",
};
const TONE: Record<Severity, string> = { High: "danger", Medium: "warning", Low: "info" };

const tone = (score: number) => (score >= 90 ? "good" : score >= 60 ? "ok" : "bad");

function Ring({ score }: { score: number }) {
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  return <div className={`audit-ring ${tone(score)}`} role="img" aria-label={`Overall score ${score} out of 100`}>
    <svg viewBox="0 0 160 160"><circle cx="80" cy="80" r={radius} className="track"/><circle cx="80" cy="80" r={radius} className="value" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} transform="rotate(-90 80 80)"/></svg>
    <div><b>{score}</b><small>Overall Score</small></div>
  </div>;
}

export function WebsiteAuditView() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);

  const run = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(typeof data.error === "string" ? data.error : "The audit could not be completed."); }
      else setResult(data as AuditResult);
    } catch { setError("Could not reach the server. Try again."); }
    setBusy(false);
  };

  const summary = result ? verdict(result.overall) : null;
  const host = result ? new URL(result.finalUrl).hostname : "";

  return <div className="audit-page">
    <div className="audit-left">
      <PageHero eyebrow="Website Audit" title="Audit Your Website" subtitle="Get a quick health check covering performance, SEO, security, accessibility and best practices."/>
      <Panel>
        <form className="audit-form" onSubmit={run}>
          <div className="audit-form-head"><span className="audit-icon"><Link2 size={20}/></span><div><h2 className="section-title">Enter a Website URL</h2><small>Type the full website address you want to audit.</small></div></div>
          <div className="audit-form-row">
            <label className="audit-url"><Link2 size={16}/><input type="text" inputMode="url" placeholder="https://www.example.com" aria-label="Website URL" value={url} onChange={e => setUrl(e.target.value)} autoComplete="off" spellCheck={false} required/></label>
            <button type="submit" className="button primary" disabled={busy}>{busy ? <Loader2 size={16} className="spin"/> : <Play size={16}/>}{busy ? "Auditing…" : "Run Audit"}</button>
          </div>
          {error && <p className="audit-error" role="alert">{error}</p>}
        </form>
      </Panel>
      <Panel title="What We Check">
        <div className="audit-checks">
          {CATEGORIES.map(category => { const Icon = ICONS[category]; return <div key={category} className="audit-check"><span className="audit-icon"><Icon size={18}/></span><b>{category}</b><small>{BLURB[category]}</small></div>; })}
        </div>
        <p className="audit-note">This is a fast health check of the page&apos;s HTML, headers and response time. It does not measure rendering or Core Web Vitals.</p>
      </Panel>
    </div>

    <div className="audit-right">
      {busy ? <Panel><div className="audit-empty"><Loader2 size={28} className="spin"/><b>Auditing…</b><small>Fetching the page and running the checks.</small></div></Panel>
        : !result || !summary ? <Panel><div className="audit-empty"><Gauge size={30}/><b>No audit yet</b><small>Enter a website address and choose Run Audit to see the results here.</small></div></Panel>
        : <>
          <Panel>
            <div className="audit-report-head">
              <div><div className="eyebrow">Audit Results</div><h2 className="audit-title">Website Audit Report</h2>
                <a className="audit-link" href={result.finalUrl} target="_blank" rel="noopener noreferrer">{host}<ExternalLink size={14}/></a>
                <small>Audited on {new Date(result.auditedAt).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</small></div>
              <button type="button" className="button primary audit-print" onClick={() => window.print()}><Download size={16}/>Download PDF Report</button>
            </div>
            <div className="audit-score">
              <Ring score={result.overall}/>
              <div className="audit-verdict"><span className={`audit-pill ${tone(result.overall)}`}>{summary.label}</span><p>{summary.text}</p><small>{result.passed} of {result.total} checks passed · responded in {result.responseMs} ms</small></div>
            </div>
          </Panel>
          <div className="audit-cats">
            {CATEGORIES.map(category => { const Icon = ICONS[category]; const score = result.scores[category]; return <div key={category} className="audit-cat"><span><Icon size={16}/>{category}</span><b>{score}</b><div className="audit-bar"><i className={tone(score)} style={{ width: `${score}%` }}/></div></div>; })}
          </div>
          <Panel title="Key Findings">
            {result.findings.length === 0 ? <div className="audit-empty"><b>Nothing to fix</b><small>Every check passed.</small></div>
              : <ul className="audit-findings">{result.findings.map((finding, index) => <li key={index}>{finding.severity === "Low" ? <Info size={18} className="info"/> : <AlertTriangle size={18} className={TONE[finding.severity]}/>}<span>{finding.message}<small>{finding.category}</small></span><i className={`audit-sev ${TONE[finding.severity]}`}>{finding.severity}</i></li>)}</ul>}
          </Panel>
        </>}
    </div>

    <style jsx global>{`
      .audit-page{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:14px;align-items:start}
      .audit-left,.audit-right{display:grid;gap:14px;min-width:0}
      .audit-icon{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:var(--green-soft);color:var(--green);flex:none}
      .audit-form{display:grid;gap:16px}
      .audit-form-head{display:flex;gap:14px;align-items:center}.audit-form-head small{color:var(--muted)}
      .audit-form-row{display:flex;gap:12px}
      .audit-url{flex:1;min-width:0;height:46px;display:flex;align-items:center;gap:10px;padding:0 14px;border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--muted)}
      .audit-url:focus-within{border-color:var(--green)}.audit-url input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--text)}
      .audit-form-row .button{height:46px;padding:0 22px}.audit-error{color:#e5736f;margin:0;font-size:13px}
      .audit-checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:12px}
      .audit-check{border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px;display:grid;gap:6px;align-content:start}.audit-check small{color:var(--muted);font-size:12px;line-height:1.4}
      .audit-note{margin:16px 0 0;color:var(--muted);font-size:12px}
      .audit-empty{min-height:220px;display:grid;place-content:center;justify-items:center;gap:8px;text-align:center;color:var(--muted)}.audit-empty b{color:var(--text)}
      .audit-report-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}
      .audit-title{font:30px var(--font-display);margin:8px 0 6px}.audit-report-head small{display:block;color:var(--muted);margin-top:6px}
      .audit-link{display:inline-flex;align-items:center;gap:6px;font-weight:500}
      .audit-score{display:flex;gap:28px;align-items:center;margin-top:20px;padding-top:20px;border-top:1px solid var(--line);flex-wrap:wrap}
      .audit-ring{position:relative;width:150px;height:150px;flex:none}.audit-ring svg{width:100%;height:100%}
      .audit-ring circle{fill:none;stroke-width:12}.audit-ring .track{stroke:var(--line)}.audit-ring .value{stroke-linecap:round;transition:stroke-dashoffset .7s ease}
      .audit-ring.good .value{stroke:var(--green)}.audit-ring.ok .value{stroke:#e0a02a}.audit-ring.bad .value{stroke:#d9534f}
      .audit-ring>div{position:absolute;inset:0;display:grid;place-content:center;text-align:center}.audit-ring b{font:400 40px var(--font-display)}.audit-ring small{color:var(--muted);font-size:11px}
      .audit-verdict{display:grid;gap:8px;min-width:200px;flex:1}.audit-verdict p{margin:0}.audit-verdict small{color:var(--muted)}
      .audit-pill{justify-self:start;padding:4px 12px;border-radius:8px;font-weight:600;font-size:13px}
      .audit-pill.good{background:var(--green-soft);color:var(--green)}.audit-pill.ok{background:rgba(224,160,42,.16);color:#e0a02a}.audit-pill.bad{background:rgba(217,83,79,.16);color:#e5736f}
      .audit-cats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
      .audit-cat{border:1px solid var(--line);background:var(--panel);border-radius:var(--radius-md);padding:12px;display:grid;gap:8px;min-width:0}
      .audit-cat span{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:var(--muted)}.audit-cat b{font:400 26px var(--font-display)}
      .audit-bar{height:5px;border-radius:3px;background:var(--line);overflow:hidden}.audit-bar i{display:block;height:100%;border-radius:3px}
      .audit-bar i.good{background:var(--green)}.audit-bar i.ok{background:#e0a02a}.audit-bar i.bad{background:#d9534f}
      .audit-findings{list-style:none;margin:0;padding:0}
      .audit-findings li{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}.audit-findings li:last-child{border-bottom:0}
      .audit-findings li>span{flex:1;min-width:0;display:grid;gap:2px}.audit-findings small{color:var(--muted)}
      .audit-findings svg.danger{color:#d9534f}.audit-findings svg.warning{color:#e0a02a}.audit-findings svg.info{color:#3b8fdc}
      .audit-sev{font-style:normal;font-size:12px;font-weight:600;padding:3px 12px;border-radius:999px}
      .audit-sev.danger{background:rgba(217,83,79,.16);color:#e5736f}.audit-sev.warning{background:rgba(224,160,42,.16);color:#e0a02a}.audit-sev.info{background:rgba(59,143,220,.16);color:#5aa7ee}
      .spin{animation:audit-spin 1s linear infinite}@keyframes audit-spin{to{transform:rotate(360deg)}}
      @media(max-width:1100px){.audit-page{grid-template-columns:1fr}}
      @media(max-width:700px){.audit-cats{grid-template-columns:repeat(2,minmax(0,1fr))}.audit-form-row{flex-direction:column}}
      @media print{
        .sidebar,.topbar,.audit-left,.audit-print{display:none!important}
        .main,.main.collapsed{margin:0!important;padding:0!important}.audit-page{display:block}
        .audit-right{display:block}.audit-right>*{break-inside:avoid;margin-bottom:12px}
        body,.shell{background:#fff!important;color:#111!important}
      }
    `}</style>
  </div>;
}
