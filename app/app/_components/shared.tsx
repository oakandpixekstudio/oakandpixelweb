"use client";

import { motion } from "motion/react";
import { ChartNoAxesColumn, ChevronLeft, ChevronRight, Diamond, Grip, LayoutGrid, Leaf, List, Search, Square, Waves, type LucideIcon } from "lucide-react";

export function BrandMark({ className = "" }: { className?: string }) {
  return <span className={`brand-mark ${className}`} aria-hidden="true"><i/><i/><i/><i/></span>;
}

export function PageHero({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children?: React.ReactNode }) {
  return <motion.header className="page-hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .28 }}>
    <div className="eyebrow">{eyebrow}</div>
    <h1 className="page-title">{title}</h1>
    <p className="page-subtitle">{subtitle}</p>
    {children}
  </motion.header>;
}

export function KpiCard({ label, value, note, icon: Icon, active, iconLeft }: { label: string; value: string; note?: string; icon: LucideIcon; active?: boolean; iconLeft?: boolean }) {
  return <motion.div className={`kpi ${active ? "active" : ""} ${iconLeft ? "icon-left" : ""}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>
    {iconLeft && <Icon size={34}/>}
    <div className="kpi-text"><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div>{note && <div className="kpi-note">↑ {note}</div>}</div>
    {!iconLeft && <Icon size={24}/>}
  </motion.div>;
}

export function StatusBadge({ value }: { value: string }) {
  const green = ["Active","In Progress","Paid","Won","Completed"].includes(value);
  const warning = ["Proposal","Discovery","Sent","Medium","In Review"].includes(value);
  const danger = ["Overdue","High"].includes(value);
  return <span className={`badge ${green ? "green" : warning ? "warning" : danger ? "danger" : ""}`}>{value}</span>;
}

export function Progress({ value }: { value: number }) { return <div style={{display:"flex",alignItems:"center",gap:8}}><div className="progress"><span style={{width:`${value}%`}}/></div><span style={{fontSize:11}}>{value}%</span></div>; }

export function Panel({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{title && <header className="panel-header"><h2 className="section-title">{title}</h2>{action}</header>}<div className="panel-body">{children}</div></section>;
}

export function Money({ value }: { value: number }) { return <>R{value.toLocaleString("en-ZA")}</>; }

export function SearchBox({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="search"><Search size={17}/><input aria-label={placeholder} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>;
}

export function EmptyState({ title, body }: { title: string; body: string }) { return <div className="empty"><div><h3 className="section-title">{title}</h3><p>{body}</p></div></div>; }

/** Square brand glyph for a client, matching the design references. Falls back to initials. */
export function ClientLogo({ id, initials }: { id: string; initials: string }) {
  const glyphs: Record<string, React.ReactNode> = {
    trellis: <Grip size={20}/>,
    mavena: <b className="logo-letter">M</b>,
    rivermere: <Waves size={20}/>,
    aurelia: <b className="logo-letter">A</b>,
    lumen: <ChartNoAxesColumn size={20}/>,
    northgate: <Square size={18} strokeWidth={3}/>,
    cedar: <Leaf size={19}/>,
    stonefield: <Diamond size={18} strokeWidth={3}/>,
  };
  return <span className="logo-tile">{glyphs[id] ?? initials}</span>;
}

/** Hard-edged checkbox used in tables. Purely visual until bulk actions exist. */
export function TableCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <input type="checkbox" className="check" aria-label={label} checked={checked} onChange={e=>onChange(e.target.checked)} onClick={e=>e.stopPropagation()}/>;
}

export function ViewToggle({ value, onChange }: { value: "list" | "grid"; onChange: (value: "list" | "grid") => void }) {
  return <div className="view-toggle" role="group" aria-label="View mode">
    <button type="button" className={value === "list" ? "active" : ""} aria-pressed={value === "list"} aria-label="List view" onClick={()=>onChange("list")}><List size={18}/></button>
    <button type="button" className={value === "grid" ? "active" : ""} aria-pressed={value === "grid"} aria-label="Grid view" onClick={()=>onChange("grid")}><LayoutGrid size={18}/></button>
  </div>;
}

export function Pagination({ page, pageSize, total, noun, onPage }: { page: number; pageSize: number; total: number; noun: string; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return <div className="pagination">
    <span>Showing {from} – {to} of {total} {noun}</span>
    <div className="pager" role="navigation" aria-label="Pagination">
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={()=>onPage(page - 1)}><ChevronLeft size={16}/></button>
      {Array.from({ length: pages }, (_, i) => i + 1).map(n => <button type="button" key={n} className={n === page ? "active" : ""} aria-current={n === page ? "page" : undefined} onClick={()=>onPage(n)}>{n}</button>)}
      <button type="button" aria-label="Next page" disabled={page >= pages} onClick={()=>onPage(page + 1)}><ChevronRight size={16}/></button>
    </div>
  </div>;
}
