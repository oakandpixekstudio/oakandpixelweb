"use client";

import { useCallback, useState } from "react";

/**
 * Settings are kept in this browser (localStorage), like the rest of the demonstration workspace.
 * These panels only mount after hydration, so reading storage in the initial state is safe.
 */
const PREFIX = "oak-pixel-settings:";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const raw = localStorage.getItem(PREFIX + key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* storage full or blocked: the change lasts for this visit only */ }
}

export function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => read(key, initial));
  const set = useCallback((next: T | ((current: T) => T)) => {
    setValue(current => { const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next; write(key, resolved); return resolved; });
  }, [key]);
  return [value, set] as const;
}

/** A form with explicit Save and Discard: edits stay in a draft until saved. */
export function useDraft<T extends object>(key: string, defaults: T) {
  const [saved, setSaved] = usePersisted<T>(key, defaults);
  const merged = { ...defaults, ...saved };
  const [draft, setDraft] = useState<T>(merged);
  return {
    draft,
    set: (patch: Partial<T>) => setDraft(current => ({ ...current, ...patch })),
    save: () => setSaved(draft),
    discard: () => setDraft(merged),
    dirty: JSON.stringify(draft) !== JSON.stringify(merged),
  };
}

export type AuditEntry = { id: string; time: string; actor: string; area: string; action: string };

const SEED_AUDIT: AuditEntry[] = [
  { id: "seed-8", time: "2026-11-17T14:21:00.000Z", actor: "Oak & Pixel Admin", area: "Emails", action: "Sent email “Website content for review” to Trellis Capital" },
  { id: "seed-7", time: "2026-11-17T11:05:00.000Z", actor: "Lerato Maseko", area: "Projects", action: "Moved “Corporate Website Redesign” to In Progress" },
  { id: "seed-6", time: "2026-11-16T16:40:00.000Z", actor: "Oak & Pixel Admin", area: "Invoices", action: "Marked invoice INV-0041 as Paid" },
  { id: "seed-5", time: "2026-11-16T09:12:00.000Z", actor: "Thandi Moyo", area: "Clients", action: "Added contact Naledi Bhengu to Mavena Studio" },
  { id: "seed-4", time: "2026-11-13T13:30:00.000Z", actor: "Oak & Pixel Admin", area: "Pipeline", action: "Moved “Rivermere Marketing Site” to Negotiation" },
  { id: "seed-3", time: "2026-11-12T10:02:00.000Z", actor: "Sizwe Dlamini", area: "Tasks", action: "Completed task “Homepage wireframes”" },
  { id: "seed-2", time: "2026-11-10T08:45:00.000Z", actor: "Oak & Pixel Admin", area: "Settings", action: "Updated organisation profile" },
  { id: "seed-1", time: "2026-11-03T07:30:00.000Z", actor: "Oak & Pixel Admin", area: "People & Access", action: "Created the workspace" },
];

/** Record a settings change in the audit log. */
export function logAudit(area: string, action: string) {
  const entry: AuditEntry = { id: `a${Date.now()}${Math.random().toString(36).slice(2, 6)}`, time: new Date().toISOString(), actor: "Oak & Pixel Admin", area, action };
  write("audit", [entry, ...read<AuditEntry[]>("audit", SEED_AUDIT)].slice(0, 500));
}

export const readAudit = () => read<AuditEntry[]>("audit", SEED_AUDIT);
