"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { NotificationIcon } from "@/_components/notification-icon";
import { PageHero } from "@/_components/shared";
import { useDemoData } from "@/_providers/demo-data-provider";

export function NotificationsView() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useDemoData();
  const [tab, setTab] = useState<"All" | "Unread">("All");
  const unread = notifications.filter(n => !n.read).length;
  const rows = notifications.filter(n => tab === "All" || !n.read);
  return <>
    <PageHero eyebrow="Notifications" title="Notifications" subtitle="Updates from clients, projects, tasks and billing in one place."/>
    <div className="toolbar">
      <div className="tabs" style={{ border: 0 }}>
        {(["All", "Unread"] as const).map(t => <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t === "Unread" ? `Unread (${unread})` : "All"}</button>)}
      </div>
      <span style={{ flex: 1 }}/>
      <button className="button" onClick={markAllNotificationsRead} disabled={unread === 0}><CheckCheck size={16}/>Mark all as read</button>
    </div>
    <section className="panel">
      {rows.length === 0 ? <div className="empty">You are all caught up.</div> : rows.map(n => <Link key={n.id} href={n.href} className={`notif-row ${n.read ? "" : "unread"}`} onClick={() => markNotificationRead(n.id)}>
        <NotificationIcon type={n.type}/><span><b>{n.title}</b><small>{n.body}</small></span><time>{n.time}</time>{!n.read && <i className="unread-dot"/>}
      </Link>)}
    </section>
    <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 14 }}>Demonstration notifications. Live alerts arrive when email, billing and task services are connected.</p>
  </>;
}
