"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as seed from "@/_mocks/data";
import type { AppNotification, AppSignature, Client, EmailMessage, Invoice, Opportunity, OpportunityStage, Project, ProjectStage, Task, Template } from "@/_types";

type DemoState = {
  clients: Client[]; projects: Project[]; opportunities: Opportunity[]; tasks: Task[];
  emails: EmailMessage[]; templates: Template[]; invoices: Invoice[]; notifications: AppNotification[]; signature: AppSignature;
};
type DemoContextValue = DemoState & {
  moveProject: (id: string, stage: ProjectStage) => void;
  moveOpportunity: (id: string, stage: OpportunityStage) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  addClient: (client: Client) => void;
  addTask: (task: Task) => void;
  addEmail: (email: EmailMessage) => void;
  updateTemplate: (id: string, body: string) => void;
  upsertClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  upsertProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  upsertTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  upsertOpportunity: (opportunity: Opportunity) => void;
  deleteOpportunity: (id: string) => void;
  upsertInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  upsertTemplate: (template: Template) => void;
  deleteTemplate: (id: string) => void;
  updateEmail: (id: string, patch: Partial<EmailMessage>) => void;
  deleteEmail: (id: string) => void;
  setSignature: (signature: AppSignature) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  reset: () => void;
};

const initialState: DemoState = { clients: seed.clients, projects: seed.projects, opportunities: seed.opportunities, tasks: seed.tasks, emails: seed.emails, templates: seed.templates, invoices: seed.invoices, notifications: seed.notifications, signature: seed.signature };
const upsert = <T extends { id: string }>(rows: T[], row: T) => rows.some(r => r.id === row.id) ? rows.map(r => r.id === row.id ? row : r) : [row, ...rows];
const DemoContext = createContext<DemoContextValue | null>(null);
const STORAGE_KEY = "oak-pixel-workspace-demo-v2";

export function DemoDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        // Fill any fields added since the state was saved (e.g. dates) from the seed data.
        const parsed = JSON.parse(saved) as DemoState;
        const fill = <T extends { id: string }>(rows: T[], base: T[]) => rows.map(row => ({ ...base.find(b => b.id === row.id), ...row }));
        // Restoring persisted demonstration state is intentionally post-hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({ ...parsed, notifications: parsed.notifications ?? seed.notifications, signature: parsed.signature ?? seed.signature, clients: fill(parsed.clients, seed.clients), projects: fill(parsed.projects, seed.projects) });
      }
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state, hydrated]);

  const value = useMemo<DemoContextValue>(() => ({
    ...state,
    moveProject: (id, stage) => setState(s => ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, stage } : p) })),
    moveOpportunity: (id, stage) => setState(s => ({ ...s, opportunities: s.opportunities.map(o => o.id === id ? { ...o, stage } : o) })),
    updateTask: (id, patch) => setState(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t) })),
    addClient: client => setState(s => ({ ...s, clients: [client, ...s.clients] })),
    addTask: task => setState(s => ({ ...s, tasks: [task, ...s.tasks] })),
    addEmail: email => setState(s => ({ ...s, emails: [email, ...s.emails] })),
    updateTemplate: (id, body) => setState(s => ({ ...s, templates: s.templates.map(t => t.id === id ? { ...t, body, updated: "Just now" } : t) })),
    upsertClient: client => setState(s => ({ ...s, clients: upsert(s.clients, client) })),
    deleteClient: id => setState(s => {
      const projectIds = s.projects.filter(p => p.clientId === id).map(p => p.id);
      return { ...s, clients: s.clients.filter(c => c.id !== id), projects: s.projects.filter(p => p.clientId !== id), tasks: s.tasks.filter(t => !projectIds.includes(t.projectId)),
        opportunities: s.opportunities.filter(o => o.clientId !== id), invoices: s.invoices.filter(i => i.clientId !== id), emails: s.emails.filter(e => e.clientId !== id) };
    }),
    upsertProject: project => setState(s => ({ ...s, projects: upsert(s.projects, project) })),
    deleteProject: id => setState(s => ({ ...s, projects: s.projects.filter(p => p.id !== id), tasks: s.tasks.filter(t => t.projectId !== id),
      invoices: s.invoices.map(i => i.projectId === id ? { ...i, projectId: undefined } : i), emails: s.emails.map(e => e.projectId === id ? { ...e, projectId: undefined } : e) })),
    upsertTask: task => setState(s => ({ ...s, tasks: upsert(s.tasks, task) })),
    deleteTask: id => setState(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) })),
    upsertOpportunity: opportunity => setState(s => ({ ...s, opportunities: upsert(s.opportunities, opportunity) })),
    deleteOpportunity: id => setState(s => ({ ...s, opportunities: s.opportunities.filter(o => o.id !== id) })),
    upsertInvoice: invoice => setState(s => ({ ...s, invoices: upsert(s.invoices, invoice) })),
    deleteInvoice: id => setState(s => ({ ...s, invoices: s.invoices.filter(i => i.id !== id) })),
    upsertTemplate: template => setState(s => ({ ...s, templates: upsert(s.templates, template) })),
    deleteTemplate: id => setState(s => ({ ...s, templates: s.templates.filter(t => t.id !== id) })),
    updateEmail: (id, patch) => setState(s => ({ ...s, emails: s.emails.map(e => e.id === id ? { ...e, ...patch } : e) })),
    deleteEmail: id => setState(s => ({ ...s, emails: s.emails.filter(e => e.id !== id) })),
    setSignature: signature => setState(s => ({ ...s, signature })),
    markNotificationRead: id => setState(s => ({ ...s, notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) })),
    markAllNotificationsRead: () => setState(s => ({ ...s, notifications: s.notifications.map(n => ({ ...n, read: true })) })),
    reset: () => { localStorage.removeItem(STORAGE_KEY); setState(initialState); },
  }), [state]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemoData() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemoData must be used inside DemoDataProvider");
  return context;
}
