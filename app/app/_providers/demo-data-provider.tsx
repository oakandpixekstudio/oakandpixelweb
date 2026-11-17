"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as seed from "@/_mocks/data";
import type { Client, EmailMessage, Invoice, Opportunity, OpportunityStage, Project, ProjectStage, Task, Template } from "@/_types";

type DemoState = {
  clients: Client[]; projects: Project[]; opportunities: Opportunity[]; tasks: Task[];
  emails: EmailMessage[]; templates: Template[]; invoices: Invoice[];
};
type DemoContextValue = DemoState & {
  moveProject: (id: string, stage: ProjectStage) => void;
  moveOpportunity: (id: string, stage: OpportunityStage) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  addClient: (client: Client) => void;
  addTask: (task: Task) => void;
  addEmail: (email: EmailMessage) => void;
  updateTemplate: (id: string, body: string) => void;
  reset: () => void;
};

const initialState: DemoState = { clients: seed.clients, projects: seed.projects, opportunities: seed.opportunities, tasks: seed.tasks, emails: seed.emails, templates: seed.templates, invoices: seed.invoices };
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
        setState({ ...parsed, clients: fill(parsed.clients, seed.clients), projects: fill(parsed.projects, seed.projects) });
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
    reset: () => { localStorage.removeItem(STORAGE_KEY); setState(initialState); },
  }), [state]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemoData() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemoData must be used inside DemoDataProvider");
  return context;
}
