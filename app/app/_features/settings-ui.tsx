"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

export function Pane({ title, subtitle, icon: Icon, action, children }: { title: string; subtitle: string; icon: LucideIcon; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="panel settings-pane-card">
    <div className="panel-header" style={{ minHeight: 74 }}>
      <div className="detail-title"><Icon size={26}/><div><h2 className="section-title">{title}</h2><small style={{ color: "var(--muted)" }}>{subtitle}</small></div></div>
      {action}
    </div>
    <div className="panel-body sp-body">{children}</div>
  </section>;
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={`sp-switch ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}><i/></button>;
}

export function SaveBar({ dirty, onSave, onDiscard }: { dirty: boolean; onSave: () => void; onDiscard: () => void }) {
  return <div className="sp-savebar"><span>{dirty ? "You have unsaved changes." : "All changes saved."}</span><span style={{ flex: 1 }}/><button type="button" className="button" disabled={!dirty} onClick={onDiscard}>Discard changes</button><button type="button" className="button primary" disabled={!dirty} onClick={onSave}><Check size={16}/>Save changes</button></div>;
}

export function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <div className="sp-row"><div><b>{title}</b>{hint && <small>{hint}</small>}</div><div className="sp-row-control">{children}</div></div>;
}

export const money = (value: number) => `R${value.toLocaleString("en-ZA")}`;

export const formatWhen = (iso: string) => new Date(iso).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function SettingsStyles() {
  return <style jsx global>{`
    .settings-pane-card{min-width:0}
    .sp-body{display:grid;grid-template-columns:minmax(0,1fr);gap:18px}
    .sp-note{margin:0;color:var(--muted);font-size:12px}
    .sp-section{display:grid;grid-template-columns:minmax(0,1fr);gap:4px}
    .sp-section>h3{margin:0 0 6px;font:400 17px var(--font-display)}
    .sp-row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:12px 0;border-bottom:1px solid var(--line)}
    .sp-row:last-child{border-bottom:0}.sp-row small{display:block;color:var(--muted);margin-top:3px;font-size:12px;line-height:1.4}.sp-row b{font-weight:500}
    .sp-row-control{display:flex;align-items:center;gap:10px;flex:none}
    .sp-switch{width:40px;height:22px;border-radius:999px;border:1px solid var(--border);background:color-mix(in srgb,var(--muted) 24%,transparent);position:relative;flex:none;padding:0;cursor:pointer;transition:background .2s,border-color .2s}
    .sp-switch i{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--text);transition:transform .2s}
    .sp-switch.on{background:var(--green);border-color:var(--green)}.sp-switch.on i{transform:translateX(18px);background:#fff}
    .sp-switch:disabled{opacity:.5;cursor:not-allowed}
    .sp-savebar{display:flex;align-items:center;gap:10px;border-top:1px solid var(--line);padding-top:16px;color:var(--muted);font-size:13px;flex-wrap:wrap}
    .sp-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.sp-grid .wide{grid-column:1/-1}
    .sp-grid .field>label,.sp-label{display:block;color:var(--muted);font-size:11px;margin-bottom:7px}
    .sp-chips{display:flex;gap:8px;flex-wrap:wrap}
    .sp-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 6px 5px 12px;border:1px solid var(--border);border-radius:999px;font-size:13px}
    .sp-chip button{border:0;background:transparent;color:var(--muted);display:grid;place-items:center;padding:2px;cursor:pointer}
    .sp-user{display:flex;align-items:center;gap:12px;min-width:0}.sp-user>span:last-child{display:grid;min-width:0}.sp-user small{color:var(--muted);overflow:hidden;text-overflow:ellipsis}
    .sp-avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--green-soft);color:var(--green);font-size:12px;font-weight:600;flex:none}
    .sp-tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .sp-two{display:grid;grid-template-columns:240px minmax(0,1fr);gap:16px;align-items:start}
    .sp-list{display:grid;gap:6px}.sp-list button{display:grid;gap:2px;text-align:left;padding:10px 12px;border:1px solid var(--line);border-radius:var(--radius-sm);background:transparent;cursor:pointer}
    .sp-list button.active{border-color:var(--green);background:var(--green-soft)}.sp-list small{color:var(--muted)}
    .sp-matrix{width:100%;border-collapse:collapse}.sp-matrix th{color:var(--muted);font-size:11px;font-weight:500;text-align:center;height:38px;border-bottom:1px solid var(--line)}
    .sp-matrix th:first-child,.sp-matrix td:first-child{text-align:left;padding-left:4px}.sp-matrix td{height:44px;border-bottom:1px solid var(--line);text-align:center}
    .sp-stage{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:var(--radius-sm)}.sp-stage i.dot{width:12px;height:12px;border-radius:50%;flex:none}
    .sp-stage .grow{flex:1;min-width:0;display:grid}.sp-stage small{color:var(--muted)}
    .sp-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;align-items:stretch;width:100%}
    .sp-card{border:1px solid var(--line);border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;gap:10px;min-width:0}.sp-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}.sp-card .sp-desc{flex:1 1 auto;min-height:3em}.sp-card>.button{margin-top:auto;width:100%}
    .sp-card header{display:flex;align-items:center;gap:12px}.sp-card header b{display:block}
    .sp-icon{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:var(--green-soft);color:var(--green);flex:none}
    .sp-code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;background:color-mix(in srgb,var(--text) 6%,transparent);padding:8px 10px;border-radius:8px;overflow-wrap:anywhere}
    .sp-drop{border:1px dashed var(--border);border-radius:var(--radius-md);padding:20px;display:grid;gap:10px;justify-items:start}
    .sp-table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--radius-sm)}
    .sp-matrix-events td:first-child{padding-right:12px}
    @media(max-width:900px){.sp-two{grid-template-columns:1fr}.sp-grid{grid-template-columns:1fr}.sp-row{align-items:flex-start;flex-direction:column}}
  `}</style>;
}
