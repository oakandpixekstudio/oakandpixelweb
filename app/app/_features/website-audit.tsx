"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Check, Code2, Download, ExternalLink, Eye, FileText, Gauge, Info, Link2, Loader2, MousePointerClick, Palette, Play, Search, ShieldCheck, Accessibility } from "lucide-react";
import { PageHero, Panel } from "@/_components/shared";
import { AuditReport } from "@/_features/audit-report";
import { CATEGORIES, FOCUS, verdict } from "@/_lib/audit";
import type { AuditCategory, AuditResult, Severity } from "@/_lib/audit";

const ICONS: Record<AuditCategory, typeof Gauge> = { Performance: Gauge, SEO: Search, Security: ShieldCheck, Accessibility, "Best Practices": Code2, "Brand & Design": Palette, "Content & Conversion": MousePointerClick };
const TONE: Record<Severity, string> = { High: "danger", Medium: "warning", Low: "info" };
const SHOWN = 8;

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
  const [client, setClient] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [all, setAll] = useState(false);
  const [preview, setPreview] = useState(false);

  const run = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, client }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(typeof data.error === "string" ? data.error : "The audit could not be completed."); }
      else { setResult(data as AuditResult); setAll(false); }
    } catch { setError("Could not reach the server. Try again."); }
    setBusy(false);
  };

  const summary = result ? verdict(result.overall) : null;
  const host = result ? new URL(result.finalUrl).hostname : "";
  const findings = result ? (all ? result.findings : result.findings.slice(0, SHOWN)) : [];

  return <div>
    <div className="audit-page">
      <div className="audit-left">
        <PageHero eyebrow="Website Audit" title="Audit Your Website" subtitle="A full health check covering performance, SEO, security, accessibility, brand and design, and how well the site turns visitors into enquiries."/>
        <Panel>
          <form className="audit-form" onSubmit={run}>
            <div className="audit-form-head"><span className="audit-icon"><Link2 size={20}/></span><div><h2 className="section-title">Enter a Website URL</h2><small>Type the full website address you want to audit.</small></div></div>
            <div className="audit-form-row">
              <label className="audit-url"><Link2 size={16}/><input type="text" inputMode="url" placeholder="https://www.example.com" aria-label="Website URL" value={url} onChange={e => setUrl(e.target.value)} autoComplete="off" spellCheck={false} required/></label>
              <button type="submit" className="button primary" disabled={busy}>{busy ? <Loader2 size={16} className="spin"/> : <Play size={16}/>}{busy ? "Auditing…" : "Run Audit"}</button>
            </div>
            <label className="audit-url audit-client"><FileText size={16}/><input type="text" placeholder="Prepared for (optional): client or company name" aria-label="Prepared for" value={client} maxLength={80} onChange={e => setClient(e.target.value)} autoComplete="off"/></label>
            {error && <p className="audit-error" role="alert">{error}</p>}
          </form>
        </Panel>
        <Panel title="What We Check">
          <div className="audit-checks">
            {CATEGORIES.map(category => { const Icon = ICONS[category]; return <div key={category} className="audit-check"><span className="audit-icon"><Icon size={18}/></span><b>{category}</b><small>{FOCUS[category]}</small></div>; })}
          </div>
          <p className="audit-note">Some design judgements (how the site looks) need an AI key, and exact speed scores need a Google PageSpeed key. Without them the audit uses strict built-in checks and says so.</p>
        </Panel>
      </div>

      <div className="audit-right">
        {busy ? <Panel><div className="audit-empty"><Loader2 size={28} className="spin"/><b>Auditing…</b><small>Fetching the page and its styles, then running every check. This can take up to a minute.</small></div></Panel>
          : !result || !summary ? <Panel><div className="audit-empty"><Gauge size={30}/><b>No audit yet</b><small>Enter a website address and choose Run Audit to see the results here.</small></div></Panel>
          : <>
            <Panel>
              <div className="audit-report-head">
                <div><div className="eyebrow">Audit Results</div><h2 className="audit-title">Website Audit Report</h2>
                  <a className="audit-link" href={result.finalUrl} target="_blank" rel="noopener noreferrer">{host}<ExternalLink size={14}/></a>
                  <small>{result.preparedFor ? `Prepared for ${result.preparedFor} · ` : ""}Audited on {new Date(result.auditedAt).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</small></div>
                <div className="audit-actions"><button type="button" className="button" onClick={() => setPreview(true)}><Eye size={16}/>Preview report</button><button type="button" className="button primary" onClick={() => setPreview(true)}><Download size={16}/>Download PDF Report</button></div>
              </div>
              <div className="audit-score">
                <Ring score={result.overall}/>
                <div className="audit-verdict"><span className={`audit-pill ${tone(result.overall)}`}>{summary.label}</span><p>{summary.text}</p><small>{result.passed} of {result.total} checks passed · responded in {result.responseMs} ms</small><small className="audit-source">{result.source === "lighthouse" ? "Scored with Google Lighthouse (mobile) plus design, content and security checks" : "Built-in quick check"}</small></div>
              </div>
              {result.notice && <p className="audit-notice" role="status"><Info size={15}/>{result.notice}</p>}
              {result.metrics && result.metrics.length > 0 && <div className="audit-metrics">{result.metrics.map(metric => <div key={metric.label}><small>{metric.label}</small><b className={metric.rating}>{metric.value}</b></div>)}</div>}
            </Panel>
            <div className="audit-cats">
              {CATEGORIES.map(category => { const Icon = ICONS[category]; const score = result.scores[category]; return <div key={category} className="audit-cat"><span><Icon size={16}/>{category}</span><b>{score}</b><div className="audit-bar"><i className={tone(score)} style={{ width: `${score}%` }}/></div></div>; })}
            </div>
            {result.brandReview && <Panel title="Design Review">
              <p style={{ margin: "0 0 14px" }}>{result.brandReview.summary}</p>
              <div className="audit-ratings">{result.brandReview.ratings.map(r => <div key={r.label}><span>{r.label}</span><div className="audit-bar"><i className={tone(r.score)} style={{ width: `${r.score}%` }}/></div><b>{r.score}</b></div>)}</div>
            </Panel>}
            {result.strengths.length > 0 && <Panel title="What Is Working"><ul className="audit-strengths">{result.strengths.map((s, i) => <li key={i}><Check size={16}/>{s}</li>)}</ul></Panel>}
            <Panel title={`Key Findings (${result.findings.length})`}>
              {result.findings.length === 0 ? <div className="audit-empty"><b>Nothing to fix</b><small>Every check passed.</small></div>
                : <ul className="audit-findings">{findings.map((finding, index) => <li key={index}>{finding.severity === "Low" ? <Info size={18} className="info"/> : <AlertTriangle size={18} className={TONE[finding.severity]}/>}<span>{finding.message}{finding.fix && <em>{finding.fix}</em>}<small>{finding.category}</small></span><i className={`audit-sev ${TONE[finding.severity]}`}>{finding.severity}</i></li>)}</ul>}
              {result.findings.length > SHOWN && <button type="button" className="button" style={{ marginTop: 12 }} onClick={() => setAll(v => !v)}>{all ? "Show fewer" : `Show all ${result.findings.length} findings`}</button>}
            </Panel>
          </>}
      </div>
    </div>
    {result && <AuditReport result={result} previewing={preview} onClose={() => setPreview(false)}/>}

    <style jsx global>{`
      .audit-page{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:14px;align-items:start}
      .audit-left,.audit-right{display:grid;gap:14px;min-width:0}
      .audit-icon{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:var(--green-soft);color:var(--green);flex:none}
      .audit-form{display:grid;gap:12px}
      .audit-form-head{display:flex;gap:14px;align-items:center}.audit-form-head small{color:var(--muted)}
      .audit-form-row{display:flex;gap:12px}
      .audit-url{flex:1;min-width:0;height:46px;display:flex;align-items:center;gap:10px;padding:0 14px;border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--muted)}
      .audit-url:focus-within{border-color:var(--green)}.audit-url input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--text)}
      .audit-client{height:40px;flex:none}
      .audit-form-row .button{height:46px;padding:0 22px}.audit-error{color:#e5736f;margin:0;font-size:13px}
      .audit-checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
      .audit-check{border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px;display:grid;gap:6px;align-content:start}.audit-check small{color:var(--muted);font-size:12px;line-height:1.4}
      .audit-note{margin:16px 0 0;color:var(--muted);font-size:12px}
      .audit-empty{min-height:220px;display:grid;place-content:center;justify-items:center;gap:8px;text-align:center;color:var(--muted)}.audit-empty b{color:var(--text)}
      .audit-report-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}
      .audit-actions{display:flex;gap:10px;flex-wrap:wrap}
      .audit-title{font:30px var(--font-display);margin:8px 0 6px}.audit-report-head small{display:block;color:var(--muted);margin-top:6px}
      .audit-link{display:inline-flex;align-items:center;gap:6px;font-weight:500}
      .audit-score{display:flex;gap:28px;align-items:center;margin-top:20px;padding-top:20px;border-top:1px solid var(--line);flex-wrap:wrap}
      .audit-ring{position:relative;width:150px;height:150px;flex:none}.audit-ring svg{width:100%;height:100%}
      .audit-ring circle{fill:none;stroke-width:12}.audit-ring .track{stroke:var(--line)}.audit-ring .value{stroke-linecap:round;transition:stroke-dashoffset .7s ease}
      .audit-ring.good .value{stroke:var(--green)}.audit-ring.ok .value{stroke:#e0a02a}.audit-ring.bad .value{stroke:#d9534f}
      .audit-ring>div{position:absolute;inset:0;display:grid;place-content:center;text-align:center}.audit-ring b{font:400 40px var(--font-display)}.audit-ring small{color:var(--muted);font-size:11px}
      .audit-verdict{display:grid;gap:8px;min-width:200px;flex:1}.audit-verdict p{margin:0}.audit-verdict small{color:var(--muted)}
      .audit-source{font-size:11px}
      .audit-notice{display:flex;gap:8px;align-items:flex-start;margin:16px 0 0;padding:10px 12px;border-radius:var(--radius-sm);background:rgba(224,160,42,.12);color:#e0a02a;font-size:13px}.audit-notice svg{flex:none;margin-top:2px}
      .audit-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-top:18px}
      .audit-metrics>div{border:1px solid var(--line);border-radius:var(--radius-sm);padding:10px 12px;display:grid;gap:4px}.audit-metrics small{color:var(--muted);font-size:11px}.audit-metrics b{font-weight:600}
      .audit-metrics b.good{color:var(--green)}.audit-metrics b.ok{color:#e0a02a}.audit-metrics b.bad{color:#e5736f}
      .audit-pill{justify-self:start;padding:4px 12px;border-radius:8px;font-weight:600;font-size:13px}
      .audit-pill.good{background:var(--green-soft);color:var(--green)}.audit-pill.ok{background:rgba(224,160,42,.16);color:#e0a02a}.audit-pill.bad{background:rgba(217,83,79,.16);color:#e5736f}
      .audit-cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:10px}
      .audit-cat{border:1px solid var(--line);background:var(--panel);border-radius:var(--radius-md);padding:12px;display:grid;gap:8px;min-width:0}
      .audit-cat span{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:var(--muted)}.audit-cat b{font:400 26px var(--font-display)}
      .audit-bar{height:5px;border-radius:3px;background:var(--line);overflow:hidden}.audit-bar i{display:block;height:100%;border-radius:3px}
      .audit-bar i.good{background:var(--green)}.audit-bar i.ok{background:#e0a02a}.audit-bar i.bad{background:#d9534f}
      .audit-ratings{display:grid;gap:10px}.audit-ratings>div{display:grid;grid-template-columns:150px 1fr 34px;gap:12px;align-items:center;font-size:13px}.audit-ratings b{font-weight:600;text-align:right}
      .audit-strengths{list-style:none;margin:0;padding:0;display:grid;gap:8px}.audit-strengths li{display:flex;gap:10px;align-items:flex-start}.audit-strengths svg{color:var(--green);flex:none;margin-top:2px}
      .audit-findings{list-style:none;margin:0;padding:0}
      .audit-findings li{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}.audit-findings li:last-child{border-bottom:0}
      .audit-findings li>svg{margin-top:2px;flex:none}
      .audit-findings li>span{flex:1;min-width:0;display:grid;gap:3px}.audit-findings small{color:var(--muted)}.audit-findings em{font-style:normal;color:var(--muted);font-size:12px;line-height:1.45}
      .audit-findings svg.danger{color:#d9534f}.audit-findings svg.warning{color:#e0a02a}.audit-findings svg.info{color:#3b8fdc}
      .audit-sev{font-style:normal;font-size:12px;font-weight:600;padding:3px 12px;border-radius:999px;flex:none}
      .audit-sev.danger{background:rgba(217,83,79,.16);color:#e5736f}.audit-sev.warning{background:rgba(224,160,42,.16);color:#e0a02a}.audit-sev.info{background:rgba(59,143,220,.16);color:#5aa7ee}
      .spin{animation:audit-spin 1s linear infinite}@keyframes audit-spin{to{transform:rotate(360deg)}}
      @media(max-width:1100px){.audit-page{grid-template-columns:1fr}}
      @media(max-width:700px){.audit-form-row{flex-direction:column}.audit-ratings>div{grid-template-columns:110px 1fr 30px}}

      /* ================= Professional report (preview and PDF) ================= */
      .audit-report-root{display:none}
      .audit-report-root.preview{display:block;position:fixed;inset:0;z-index:300;overflow:auto;background:#dfe6e1;padding:0 16px 40px}
      .rp-toolbar{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;margin:0 -16px 18px;padding:12px 24px;background:#0f2a21;color:#fff}
      .rp-btn{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:8px;border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;cursor:pointer;font:inherit}
      .rp-btn.primary{background:#08bf68;border-color:#08bf68;color:#06281a;font-weight:600}
      .rp-sheet{--g:#006846;--amber:#9b5a18;--blue:#2c6b89;--grey:#607073;--ink:#0d0d0d;--fill:#ecf5ef;--fill2:#f8faf8;--line:#d9e2dc;
        width:210mm;min-height:297mm;margin:0 auto 18px;padding:18mm 17mm 16mm;background:#fff;color:var(--ink);box-shadow:0 6px 30px rgba(10,30,20,.18);box-sizing:border-box;
        font-family:"Calibri Light",Calibri,Carlito,"Segoe UI",Arial,sans-serif;font-weight:300;font-size:10.5pt;line-height:1.5}
      .rp-sheet *{box-sizing:border-box}
      .rp-sheet h1,.rp-sheet h2,.rp-sheet h3{font-family:"EB Garamond","Californian FB",Garamond,"Libre Caslon Display",Georgia,serif;font-weight:500;color:var(--ink);margin:0}
      .rp-sheet b{font-family:Calibri,Carlito,"Segoe UI",Arial,sans-serif;font-weight:700}
      .rp-sheet h2{font-size:26pt;line-height:1.1;margin:6px 0 10px}.rp-sheet h3{font-size:15pt;margin:4px 0 6px}
      .rp-sheet p{margin:0 0 8px}
      .rp-section-label{font:700 9pt Calibri,Carlito,Arial,sans-serif;letter-spacing:.14em;color:var(--g);border-bottom:1.5px solid var(--g);padding-bottom:6px;margin-bottom:12px}
      .rp-brandline{display:flex;align-items:center;gap:10px;font:500 15pt "EB Garamond",Garamond,Georgia,serif;color:var(--ink)}
      .rp-brandline .brand-mark{--mark-ink:#0a0a09;--mark-dot:#fff;width:28px;height:28px}
      .rp-cover{display:flex;flex-direction:column;background:linear-gradient(180deg,#fff 0,#fff 62%,var(--fill) 100%)}
      .rp-cover-main{flex:1;padding-top:30mm}
      .rp-eyebrow{font:700 9.5pt Calibri,Carlito,Arial,sans-serif;letter-spacing:.2em;color:var(--g);margin-bottom:10px}
      .rp-cover h1{font-size:44pt;line-height:1.02;letter-spacing:-.01em;margin-bottom:14px}
      .rp-lede{font-size:13pt;color:var(--grey);max-width:135mm;margin-bottom:22px!important}
      .rp-meta{display:grid;grid-template-columns:42mm 1fr;gap:8px;padding:8px 0;border-top:1px solid var(--line);font-size:11pt}.rp-meta span{font:700 8.5pt Calibri,Carlito,Arial,sans-serif;letter-spacing:.14em;color:var(--grey);padding-top:3px}
      .rp-meta b{font-weight:400;font-family:inherit;overflow-wrap:anywhere}
      .rp-scorecard{display:flex;align-items:center;gap:22px;margin:22px 0 0;padding:18px 22px;background:var(--fill);border-radius:14px}
      .rp-scorecard p{font:500 15pt "EB Garamond",Garamond,Georgia,serif;margin:2px 0 4px}.rp-scorecard small{color:var(--grey);font-size:10pt}
      .rp-verdict{font:700 10pt Calibri,Carlito,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase}
      .rp-ring{stroke:var(--g)}.rp-ring.fair{stroke:#3d8f6a}.rp-ring.mid{stroke:#c9892b}.rp-ring.bad{stroke:#b3261e}
      .rp-ring-text{font:500 44px "EB Garamond",Garamond,Georgia,serif;fill:#0d0d0d}.rp-ring-sub{font:12px Calibri,Carlito,Arial,sans-serif;fill:#607073}
      .rp-verdict.good,.rp-score.good{color:var(--g)}.rp-verdict.fair,.rp-score.fair{color:#2f7f5d}.rp-verdict.mid,.rp-score.mid{color:#a96d12}.rp-verdict.bad,.rp-score.bad{color:#b3261e}
      .rp-shot{margin:18px 0 0;display:flex;align-items:flex-end;gap:12px}.rp-shot img{height:68mm;width:auto;border:1px solid var(--line);border-radius:10px;box-shadow:0 4px 16px rgba(10,30,20,.15)}.rp-shot figcaption{color:var(--grey);font-size:9pt}
      .rp-coverfoot{color:var(--grey);font-size:9.5pt;border-top:1px solid var(--line);padding-top:10px}
      .rp-callout{display:flex;justify-content:space-between;align-items:center;gap:18px;background:var(--fill);border-radius:14px;padding:16px 20px;margin-bottom:10px}.rp-callout small{font:700 8.5pt Calibri,Carlito,Arial,sans-serif;letter-spacing:.14em;color:var(--g)}.rp-callout p{margin:0}
      .rp-h4{font:700 9pt Calibri,Carlito,Arial,sans-serif;letter-spacing:.14em;color:var(--g);margin:18px 0 8px}
      .rp-lead{font-size:11.5pt;color:#333;margin-bottom:12px!important}
      .rp-table{width:100%;border-collapse:collapse;font-size:10pt}.rp-table th{text-align:left;font:700 8pt Calibri,Carlito,Arial,sans-serif;letter-spacing:.12em;color:var(--grey);padding:6px 8px;border-bottom:1.5px solid var(--g)}
      .rp-table td{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}.rp-table tbody tr:nth-child(even){background:var(--fill2)}.rp-score{font-weight:700;white-space:nowrap;font-family:Calibri,Carlito,Arial,sans-serif}
      .rp-bar{display:block;width:100%;min-width:60px;height:7px;background:#e4ebe6;border-radius:4px;overflow:hidden;margin-top:6px}.rp-bar i{display:block;height:100%}
      .rp-bar i.good{background:var(--g)}.rp-bar i.fair{background:#3d8f6a}.rp-bar i.mid{background:#c9892b}.rp-bar i.bad{background:#b3261e}
      .rp-metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.rp-metrics>div{background:var(--fill2);border:1px solid var(--line);border-radius:8px;padding:8px 10px;display:grid}.rp-metrics small{color:var(--grey);font-size:8.5pt}.rp-metrics b.good{color:var(--g)}.rp-metrics b.ok{color:#a96d12}.rp-metrics b.bad{color:#b3261e}
      .rp-top,.rp-strengths{margin:0;padding:0;list-style:none;display:grid;gap:7px}.rp-top li{display:flex;gap:10px;align-items:baseline}
      .rp-strengths li{padding-left:18px;position:relative}.rp-strengths li:before{content:"";position:absolute;left:2px;top:.55em;width:7px;height:7px;background:var(--g);border-radius:2px}
      .rp-num{font:500 14pt "EB Garamond",Garamond,Georgia,serif;color:var(--g);min-width:22px}
      .rp-sev{display:inline-block;font:700 7.5pt Calibri,Carlito,Arial,sans-serif;letter-spacing:.1em;padding:2px 8px;border-radius:999px;white-space:nowrap}
      .rp-sev.High{background:#fbe4e2;color:#b3261e}.rp-sev.Medium{background:#faecd6;color:#8a5200}.rp-sev.Low{background:#dcecf4;color:#1f5974}
      .rp-cat{font:700 7.5pt Calibri,Carlito,Arial,sans-serif;letter-spacing:.1em;color:var(--grey)}
      .rp-finding{border:1px solid var(--line);border-left:4px solid var(--g);border-radius:8px;padding:10px 14px;margin-bottom:10px;break-inside:avoid;page-break-inside:avoid;background:#fff}
      .rp-finding-head{display:flex;align-items:center;gap:10px;margin-bottom:6px}.rp-finding p{margin:0 0 5px;font-size:10pt}.rp-finding b{font-size:8pt;letter-spacing:.1em;color:var(--grey)}
      .rp-plan td:first-child{width:24mm}
      .rp-note{font-size:9.5pt;color:var(--grey)}
      .rp-next{margin-top:22px;padding:16px 20px;border-radius:14px;background:#0f2a21;color:#fff}.rp-next h3{color:#fff}.rp-next p{color:#d6e6dc;margin:0}.rp-next b{color:#fff}
      .rp-cover-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rp-cover-grid>div{background:var(--fill2);border:1px solid var(--line);border-radius:10px;padding:10px 14px}.rp-cover-grid p{margin:2px 0 0;color:var(--grey);font-size:9.5pt}
      @page{size:A4;margin:14mm 0}
      @media print{
        body>*:not(.audit-report-root){display:none!important}
        html,body{background:#fff!important;height:auto!important;overflow:visible!important}
        .audit-report-root,.audit-report-root.preview{display:block!important;position:static!important;overflow:visible!important;background:#fff!important;padding:0!important}
        .rp-toolbar{display:none!important}
        .rp-sheet{margin:0!important;box-shadow:none!important;width:auto!important;min-height:0!important;padding:0 16mm!important;break-after:page;page-break-after:always}
        .rp-sheet:last-child{break-after:auto;page-break-after:auto}
        .rp-cover{min-height:266mm!important}
        *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      }
    `}</style>
  </div>;
}
