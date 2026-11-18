"use client";

import { signOut } from "@/_lib/sign-out";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CalendarDays, CheckCheck, ChevronDown, ExternalLink, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { navigation } from "@/_config/navigation";
import { BrandMark } from "@/_components/shared";
import { InstallButton } from "@/_components/install-button";
import { NotificationIcon } from "@/_components/notification-icon";
import { useDemoData } from "@/_providers/demo-data-provider";
import { DialogProvider } from "@/_components/dialogs";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState<"profile" | "notifications" | null>(null);
  const profileOpen = openMenu === "profile";
  const notifOpen = openMenu === "notifications";
  const setProfileOpen = (open: boolean) => setOpenMenu(open ? "profile" : null);
  const menuRoot = useRef<HTMLDivElement>(null);
  const { notifications, markNotificationRead, markAllNotificationsRead } = useDemoData();
  const unread = notifications.filter(n => !n.read).length;
  const [query, setQuery] = useState("");
  useEffect(() => {
    // Theme resolution is browser-only; defer the toggle until hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try { if (localStorage.getItem("op-sidebar") === "collapsed") setCollapsed(true); } catch {}
  }, []);
  useEffect(() => {
    if (!openMenu) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) { if (event.key === "Escape") setOpenMenu(null); return; }
      if (menuRoot.current && !menuRoot.current.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [openMenu]);
  const dark = resolvedTheme === "dark";
  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.add("theme-anim");
    setTheme(dark ? "light" : "dark");
    window.setTimeout(() => root.classList.remove("theme-anim"), 500);
  };
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("op-sidebar", next ? "collapsed" : "expanded"); } catch {}
  };

  return <DialogProvider><div className="shell">
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""} ${collapsed ? "collapsed" : ""}`}>
      <Link href="/overview" className="brand" onClick={()=>setMobileOpen(false)}><BrandMark/><span className="brand-name">Oak &amp; Pixel</span></Link>
      <nav aria-label="Workspace navigation" className="sidebar-nav">
        {navigation.map(group => <div className="nav-group" key={group.label}>
          <div className="nav-label">{group.label}</div>
          {group.items.map(item => { const active = pathname === item.href || pathname.startsWith(item.href + "/"); const Icon=item.icon; return <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`} title={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined} onClick={()=>setMobileOpen(false)}><Icon/><span>{item.label}</span>{item.unread && <i className="nav-dot"/>}</Link>; })}
        </div>)}
      </nav>
      <div className="sidebar-foot"><button type="button" className="sidebar-toggle" onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} title={collapsed ? "Expand sidebar" : undefined}>{collapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}<span>Collapse</span></button></div>
    </aside>
    <main className={`main ${collapsed ? "collapsed" : ""}`}>
      <header className="topbar">
        <button className="icon-button" aria-label="Open navigation" onClick={()=>setMobileOpen(v=>!v)} style={{display:"none"}} id="mobile-nav-button"><Menu size={19}/></button>
        <label className="global-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&query)router.push(`/clients?q=${encodeURIComponent(query)}`)}} placeholder="Search clients, projects, emails…" aria-label="Global search"/></label>
        <div className="topbar-spacer"/>
        <div className="date-display"><CalendarDays size={18}/><span>Tue, 17 Nov 2026</span></div>
        <div className="topbar-menus" ref={menuRoot}>
        <InstallButton/>
        <a className="view-site desktop-only" href="https://www.oakandpixel.co.za" target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/><span>View website</span></a>
        <button className="button primary desktop-only" onClick={()=>setNewOpen(true)}><Plus size={18}/> New <ChevronDown size={16}/></button>
        <div className="profile-wrap">
          <button className="icon-button bell" aria-label={`Notifications (${unread} unread)`} aria-haspopup="dialog" aria-expanded={notifOpen} onClick={()=>setOpenMenu(notifOpen ? null : "notifications")}><Bell size={18}/>{unread > 0 && <i className="bell-dot"/>}</button>
          {notifOpen && <div className="menu notif-menu" role="dialog" aria-label="Notifications">
            <div className="notif-head"><b>Notifications</b>{unread > 0 && <span className="badge green">{unread} new</span>}<button type="button" className="text-btn" onClick={markAllNotificationsRead} disabled={unread === 0}><CheckCheck size={15}/>Mark all as read</button></div>
            <div className="notif-list">{notifications.slice(0,5).map(n=><Link key={n.id} href={n.href} className={`notif-item ${n.read ? "" : "unread"}`} onClick={()=>{markNotificationRead(n.id);setOpenMenu(null)}}><NotificationIcon type={n.type}/><span><b>{n.title}</b><small>{n.body}</small></span><time>{n.time}</time>{!n.read && <i className="unread-dot"/>}</Link>)}</div>
            <Link href="/notifications" className="notif-foot" onClick={()=>setOpenMenu(null)}>View all notifications</Link>
          </div>}
        </div>
        {mounted ? <button type="button" role="switch" aria-checked={dark} aria-label="Dark mode" title={dark ? "Switch to light mode" : "Switch to dark mode"} className={`theme-switch ${dark ? "is-dark" : "is-light"}`} onClick={toggleTheme}><span className="thumb" aria-hidden="true"/><Sun size={16} className="ico sun"/><Moon size={16} className="ico moon"/></button> : <span className="theme-switch placeholder" aria-hidden="true"/>}
        <div className="profile-wrap">
          <button className="profile" aria-label="Open profile menu" aria-haspopup="menu" aria-expanded={profileOpen} onClick={()=>setOpenMenu(profileOpen ? null : "profile")}><span className="profile-avatar">OP</span><ChevronDown size={15}/></button>
          {profileOpen && <div className="menu" role="menu" aria-label="Profile">
            <div className="menu-head"><span className="profile-avatar">OP</span><div><b>Oak &amp; Pixel Admin</b><small>Owner · info@oakandpixel.co.za</small></div></div>
            <Link className="menu-item" role="menuitem" href="/profile" onClick={()=>setProfileOpen(false)}><UserRound size={17}/>My profile</Link>
            <Link className="menu-item" role="menuitem" href="/settings" onClick={()=>setProfileOpen(false)}><Settings size={17}/>Settings</Link>
            <a className="menu-item" role="menuitem" href="https://www.oakandpixel.co.za" target="_blank" rel="noopener noreferrer" onClick={()=>setProfileOpen(false)}><ExternalLink size={17}/>View website</a>
            {mounted && <button type="button" className="menu-item" role="menuitem" onClick={()=>{toggleTheme();setProfileOpen(false)}}>{resolvedTheme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode</button>}
            <div className="menu-sep"/>
            <button type="button" className="menu-item danger" role="menuitem" onClick={()=>{setProfileOpen(false);void signOut()}}><LogOut size={17}/>Sign out</button>
          </div>}
        </div>
        </div>
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
  </div></DialogProvider>;
}
