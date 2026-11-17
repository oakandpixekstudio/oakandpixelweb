"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CalendarDays, ChevronDown, Menu, Moon, Plus, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { navigation } from "@/_config/navigation";
import { BrandMark } from "@/_components/shared";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    // Theme resolution is browser-only; defer the toggle until hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return <div className="shell">
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <Link href="/overview" className="brand" onClick={()=>setMobileOpen(false)}><BrandMark/><span className="brand-name">Oak &amp; Pixel</span></Link>
      <nav aria-label="Workspace navigation">
        {navigation.map(group => <div className="nav-group" key={group.label}>
          <div className="nav-label">{group.label}</div>
          {group.items.map(item => { const active = pathname === item.href || pathname.startsWith(item.href + "/"); const Icon=item.icon; return <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`} onClick={()=>setMobileOpen(false)}><Icon/><span>{item.label}</span>{item.unread && <i className="nav-dot"/>}</Link>; })}
        </div>)}
      </nav>
    </aside>
    <main className="main">
      <header className="topbar">
        <button className="icon-button" aria-label="Open navigation" onClick={()=>setMobileOpen(v=>!v)} style={{display:"none"}} id="mobile-nav-button"><Menu size={19}/></button>
        <label className="global-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&query)router.push(`/clients?q=${encodeURIComponent(query)}`)}} placeholder="Search clients, projects, emails…" aria-label="Global search"/></label>
        <div className="topbar-spacer"/>
        <div className="date-display"><CalendarDays size={18}/><span>Tue, 17 Nov 2026</span></div>
        <button className="button primary desktop-only" onClick={()=>setNewOpen(true)}><Plus size={18}/> New <ChevronDown size={16}/></button>
        <button className="icon-button" aria-label="Notifications"><Bell size={18}/></button>
        {mounted && <button className="icon-button" aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`} onClick={()=>setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{resolvedTheme === "dark" ? <Moon size={18}/> : <Sun size={18}/>}</button>}
        <button className="profile" aria-label="Open profile menu">OP</button>
      </header>
      <div className="workspace">{children}</div>
    </main>
    <style>{`@media(max-width:720px){#mobile-nav-button{display:inline-grid!important}}`}</style>
    <AnimatePresence>{newOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setNewOpen(false)}}>
      <motion.div className="modal" role="dialog" aria-modal="true" aria-label="Create new" initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:14}}>
        <div className="modal-header"><h2 className="section-title">Create new</h2><button className="icon-button" onClick={()=>setNewOpen(false)} aria-label="Close">×</button></div>
        <div className="modal-body" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[["Client","/clients"],["Project","/projects"],["Task","/tasks"],["Opportunity","/pipeline"],["Email","/emails"],["Invoice","/invoices"]].map(([label,href])=><button key={label} className="button" onClick={()=>{setNewOpen(false);router.push(href)}}><Plus size={16}/>{label}</button>)}
        </div>
      </motion.div>
    </div>}</AnimatePresence>
  </div>;
}
