"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { ExternalLink, LogOut, Settings } from "lucide-react";
import { PageHero, Panel } from "@/_components/shared";

export function ProfileView() {
  const { resolvedTheme, setTheme } = useTheme();
  return <>
    <PageHero eyebrow="Account" title="My profile" subtitle="Your details and personal preferences for this workspace."/>
    <div className="profile-grid">
      <div className="grid" style={{ alignContent: "start" }}>
        <section className="panel profile-card">
          <span className="big-avatar">OP</span>
          <div><h2>Oak &amp; Pixel Admin</h2><small>Owner · Oak &amp; Pixel Studio</small></div>
        </section>
        <Panel title="Details">
          <div className="kv"><span>Name</span><b>Oak &amp; Pixel Admin</b></div>
          <div className="kv"><span>Role</span><b>Owner</b></div>
          <div className="kv"><span>Email</span><b>info@oakandpixel.co.za</b></div>
          <div className="kv"><span>Phone</span><b>+27 (75) 089 0614</b></div>
          <p style={{ color: "var(--muted)", fontSize: 12, margin: "14px 0 0" }}>Demonstration profile. Individual accounts arrive with real sign-in.</p>
        </Panel>
      </div>
      <div className="grid" style={{ alignContent: "start" }}>
        <Panel title="Preferences">
          <div className="kv"><span>Theme</span>
            <span className="theme-toggle" role="group" aria-label="Colour theme">
              <button type="button" className={resolvedTheme !== "dark" ? "on" : ""} onClick={() => setTheme("light")}>Light</button>
              <button type="button" className={resolvedTheme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}>Dark</button>
            </span>
          </div>
          <div className="kv"><span>Timezone</span><b>(GMT+02:00) Africa/Johannesburg</b></div>
          <div className="kv"><span>Language</span><b>English (South Africa)</b></div>
        </Panel>
        <Panel title="Quick links">
          <div style={{ display: "grid", gap: 10 }}>
            <Link href="/settings" className="button"><Settings size={16}/>Workspace settings</Link>
            <a href="https://www.oakandpixel.co.za" target="_blank" rel="noopener noreferrer" className="button"><ExternalLink size={16}/>View website</a>
            <Link href="/sign-in" className="button"><LogOut size={16}/>Sign out</Link>
          </div>
        </Panel>
      </div>
    </div>
  </>;
}
