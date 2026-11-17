"use client";

import { motion } from "motion/react";
import { Search, type LucideIcon } from "lucide-react";

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

export function KpiCard({ label, value, note, icon: Icon, active }: { label: string; value: string; note?: string; icon: LucideIcon; active?: boolean }) {
  return <motion.div className={`kpi ${active ? "active" : ""}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>
    <div><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div>{note && <div className="kpi-note">↑ {note}</div>}</div>
    <Icon size={24}/>
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
