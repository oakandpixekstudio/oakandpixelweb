"use client";

import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select } from "@/_components/controls";
import { AnimatedValue, KpiCard, Money, Panel, Progress, StatusBadge } from "@/_components/shared";
import { useDemoData } from "@/_providers/demo-data-provider";
import { CalendarDays, CheckCircle2, CircleDollarSign, FolderKanban, Layers, Users } from "lucide-react";
import type { Invoice } from "@/_types";

const invoiceTotal = (i: Invoice) => i.items.reduce((s, x) => s + x.quantity * x.unitPrice, 0) * (1 + i.taxRate / 100);
const compact = (v: number) => v >= 1_000_000 ? `R${(v / 1_000_000).toFixed(1)}m` : v >= 1000 ? `R${Math.round(v / 1000)}k` : `R${v}`;
const GREEN = "var(--green)";
const DIM = "#1d6b49";

function BarPanel({ title, data, format = (v: number) => String(v) }: { title: string; data: { name: string; value: number }[]; format?: (v: number) => string }) {
  return <Panel title={title}>
    {data.length === 0 ? <div className="empty" style={{ minHeight: 180 }}>No data yet.</div> :
      <div style={{ height: 240 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="name" stroke="var(--muted)" tickLine={false} interval={0} tick={{ fontSize: 11 }}/><YAxis stroke="var(--muted)" tickLine={false} axisLine={false} tickFormatter={format}/><Tooltip formatter={v => format(Number(v))}/><Bar dataKey="value" radius={[6, 6, 0, 0]}>{data.map((d, i) => <Cell key={d.name} fill={i === 0 ? GREEN : DIM}/>)}</Bar></BarChart></ResponsiveContainer></div>}
  </Panel>;
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return <section className="panel table-wrap"><table className="data-table"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <div className="empty" style={{ minHeight: 120 }}>Nothing to report yet.</div>}</section>;
}

function ClientsReport() {
  const { clients, projects } = useDemoData();
  const active = (id: string) => projects.filter(p => p.clientId === id && p.stage !== "Completed").length;
  const sorted = [...clients].sort((a, b) => b.billed - a.billed);
  return <div className="report-stack">
    <div className="grid kpi-grid">
      <KpiCard iconLeft label="Clients" value={String(clients.length)} icon={Users} active/>
      <KpiCard iconLeft label="Active clients" value={String(clients.filter(c => c.status === "Active").length)} icon={CheckCircle2}/>
      <KpiCard iconLeft label="Total billed" value={`R${clients.reduce((s, c) => s + c.billed, 0).toLocaleString("en-ZA")}`} icon={Layers}/>
      <KpiCard iconLeft label="Open pipeline" value={`R${clients.reduce((s, c) => s + c.pipeline, 0).toLocaleString("en-ZA")}`} icon={CircleDollarSign}/>
    </div>
    <BarPanel title="Billed by client" data={sorted.map(c => ({ name: c.name.split(" ")[0], value: c.billed }))} format={compact}/>
    <Table headers={["Client", "Status", "Active projects", "Pipeline", "Total billed"]} rows={sorted.map(c => [<Link key="n" href={`/clients/${c.id}`}><strong>{c.name}</strong></Link>, <StatusBadge key="s" value={c.status}/>, active(c.id), <Money key="p" value={c.pipeline}/>, <Money key="b" value={c.billed}/>])}/>
  </div>;
}

function ProjectsReport() {
  const { projects, clients } = useDemoData();
  const stages = ["Backlog", "To Do", "In Progress", "In Review", "Completed"] as const;
  const counts = stages.map(s => ({ name: s, value: projects.filter(p => p.stage === s).length }));
  const average = projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  return <div className="report-stack">
    <div className="grid kpi-grid">
      <KpiCard iconLeft label="Projects" value={String(projects.length)} icon={FolderKanban} active/>
      <KpiCard iconLeft label="In progress" value={String(projects.filter(p => p.stage === "In Progress").length)} icon={CalendarDays}/>
      <KpiCard iconLeft label="Completed" value={String(projects.filter(p => p.stage === "Completed").length)} icon={CheckCircle2}/>
      <KpiCard iconLeft label="Average progress" value={`${average}%`} icon={Layers}/>
    </div>
    <BarPanel title="Projects by stage" data={counts}/>
    <Table headers={["Project", "Client", "Stage", "Progress", "Due"]} rows={projects.map(p => [<Link key="n" href={`/projects/${p.id}`}><strong>{p.name}</strong></Link>, clients.find(c => c.id === p.clientId)?.name ?? "—", <StatusBadge key="s" value={p.stage}/>, <Progress key="p" value={p.progress}/>, p.due])}/>
  </div>;
}

function FinancialsReport() {
  const { invoices, clients } = useDemoData();
  const invoiced = invoices.reduce((s, i) => s + invoiceTotal(i), 0);
  const paid = invoices.reduce((s, i) => s + i.paid, 0);
  const byStatus = (["Draft", "Sent", "Paid", "Overdue"] as const).map(s => ({ name: s, value: invoices.filter(i => i.status === s).reduce((sum, i) => sum + invoiceTotal(i), 0) }));
  return <div className="report-stack">
    <div className="grid kpi-grid">
      <KpiCard iconLeft label="Total invoiced" value={`R${Math.round(invoiced).toLocaleString("en-ZA")}`} icon={Layers} active/>
      <KpiCard iconLeft label="Paid" value={`R${paid.toLocaleString("en-ZA")}`} icon={CheckCircle2}/>
      <KpiCard iconLeft label="Outstanding" value={`R${Math.max(0, Math.round(invoiced - paid)).toLocaleString("en-ZA")}`} icon={CircleDollarSign}/>
      <KpiCard iconLeft label="Overdue invoices" value={String(invoices.filter(i => i.status === "Overdue").length)} icon={CalendarDays}/>
    </div>
    <BarPanel title="Invoiced value by status" data={byStatus} format={compact}/>
    <Table headers={["Invoice", "Client", "Status", "Due", "Total", "Paid"]} rows={invoices.map(i => [<Link key="n" href={`/invoices/${i.id}`}><strong>{i.id}</strong></Link>, clients.find(c => c.id === i.clientId)?.name ?? "—", <StatusBadge key="s" value={i.status}/>, i.dueDate, <Money key="t" value={Math.round(invoiceTotal(i))}/>, <Money key="p" value={i.paid}/>])}/>
  </div>;
}

function useTeam() {
  const { tasks } = useDemoData();
  const people = Array.from(new Set(tasks.map(t => t.assignee)));
  return people.map(name => {
    const own = tasks.filter(t => t.assignee === name);
    const open = own.filter(t => t.status !== "Completed").length;
    return { name, total: own.length, open, done: own.length - open, progress: own.length ? Math.round(own.reduce((s, t) => s + t.progress, 0) / own.length) : 0 };
  }).sort((a, b) => b.open - a.open);
}

function TeamReport() {
  const team = useTeam();
  return <div className="report-stack">
    <div className="grid kpi-grid">
      <KpiCard iconLeft label="Team members" value={String(team.length)} icon={Users} active/>
      <KpiCard iconLeft label="Open tasks" value={String(team.reduce((s, m) => s + m.open, 0))} icon={CalendarDays}/>
      <KpiCard iconLeft label="Completed tasks" value={String(team.reduce((s, m) => s + m.done, 0))} icon={CheckCircle2}/>
      <KpiCard iconLeft label="Average progress" value={`${team.length ? Math.round(team.reduce((s, m) => s + m.progress, 0) / team.length) : 0}%`} icon={Layers}/>
    </div>
    <BarPanel title="Open tasks per person" data={team.map(m => ({ name: m.name, value: m.open }))}/>
    <Table headers={["Team member", "Total tasks", "Open", "Completed", "Average progress"]} rows={team.map(m => [<span key="n" className="avatar sm">{m.name}</span>, m.total, m.open, m.done, <Progress key="p" value={m.progress}/>])}/>
  </div>;
}

function UtilisationReport() {
  const team = useTeam();
  const capacity = 4;
  return <div className="report-stack">
    <Panel title="Utilisation by team member" action={<span style={{ color: "var(--muted)", fontSize: 12 }}>Capacity: {capacity} open tasks each</span>}>
      {team.length === 0 ? <div className="empty" style={{ minHeight: 140 }}>No tasks assigned yet.</div> : team.map(m => {
        const pct = Math.min(100, Math.round(m.open / capacity * 100));
        return <div className="util-row" key={m.name}><span className="avatar sm">{m.name}</span><div className="util-bar"><span style={{ width: `${pct}%`, background: pct >= 100 ? "#e0605c" : GREEN }}/></div><b><AnimatedValue value={`${pct}%`}/></b><small>{m.open} open · {m.done} done</small></div>;
      })}
    </Panel>
    <style jsx>{`.util-row{display:grid;grid-template-columns:36px 1fr 56px 130px;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--line)}.util-row:last-child{border-bottom:0}.util-bar{height:8px;border-radius:999px;background:color-mix(in srgb,var(--muted) 24%,transparent);overflow:hidden}.util-bar span{display:block;height:100%;border-radius:999px;transition:width .6s}.util-row b{font-weight:400;text-align:right}.util-row small{color:var(--muted)}`}</style>
  </div>;
}

type Entity = "Clients" | "Projects" | "Tasks" | "Invoices" | "Opportunities";
function CustomReport() {
  const { clients, projects, tasks, invoices, opportunities } = useDemoData();
  const [entity, setEntity] = useState<Entity>("Projects");
  const [measure, setMeasure] = useState("Count");
  const [groupIndex, setGroupIndex] = useState(0);
  type Row = { group: Record<string, string>; value: number };
  const config: Record<Entity, { groups: string[]; rows: Row[] }> = {
    Clients: { groups: ["Status", "Service", "Industry"], rows: clients.map(c => ({ group: { Status: c.status, Service: c.service, Industry: c.industry }, value: c.billed })) },
    Projects: { groups: ["Stage", "Service", "Manager"], rows: projects.map(p => ({ group: { Stage: p.stage, Service: p.service, Manager: p.manager }, value: p.progress })) },
    Tasks: { groups: ["Status", "Priority", "Assignee"], rows: tasks.map(t => ({ group: { Status: t.status, Priority: t.priority, Assignee: t.assignee }, value: t.progress })) },
    Invoices: { groups: ["Status", "Client"], rows: invoices.map(i => ({ group: { Status: i.status, Client: clients.find(c => c.id === i.clientId)?.name ?? "—" }, value: Math.round(invoiceTotal(i)) })) },
    Opportunities: { groups: ["Stage", "Service", "Owner"], rows: opportunities.map(o => ({ group: { Stage: o.stage, Service: o.service, Owner: o.owner }, value: o.value })) },
  };
  const valueLabel: Record<Entity, string> = { Clients: "Total billed", Projects: "Average progress", Tasks: "Average progress", Invoices: "Total value", Opportunities: "Total value" };
  const { groups, rows } = config[entity];
  const groupName = groups[Math.min(groupIndex, groups.length - 1)];
  const buckets = new Map<string, number[]>();
  rows.forEach(r => { const key = r.group[groupName]; buckets.set(key, [...(buckets.get(key) ?? []), r.value]); });
  const useAverage = entity === "Projects" || entity === "Tasks";
  const data = Array.from(buckets, ([name, values]) => ({ name, count: values.length, value: measure === "Count" ? values.length : useAverage ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : values.reduce((s, v) => s + v, 0) })).sort((a, b) => b.value - a.value);
  const money = measure !== "Count" && !useAverage;
  return <div className="report-stack">
    <Panel title="Build a report">
      <div className="custom-controls">
        <label>Report on<Select aria-label="Report on" value={entity} onChange={e => { setEntity(e.target.value as Entity); setGroupIndex(0); }}>{(Object.keys(config) as Entity[]).map(k => <option key={k}>{k}</option>)}</Select></label>
        <label>Group by<Select aria-label="Group by" value={groupName} onChange={e => setGroupIndex(groups.indexOf(e.target.value))}>{groups.map(g => <option key={g}>{g}</option>)}</Select></label>
        <label>Measure<Select aria-label="Measure" value={measure} onChange={e => setMeasure(e.target.value)}><option>Count</option><option>{valueLabel[entity]}</option></Select></label>
      </div>
    </Panel>
    <BarPanel title={`${entity} by ${groupName.toLowerCase()}`} data={data.map(d => ({ name: d.name, value: d.value }))} format={money ? compact : undefined}/>
    <Table headers={[groupName, "Records", measure]} rows={data.map(d => [d.name, d.count, money ? <Money key="m" value={d.value}/> : measure === "Count" ? d.value : `${d.value}%`])}/>
    <style jsx>{`.custom-controls{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.custom-controls label{display:grid;gap:7px;color:var(--muted);font-size:11.5px}@media(max-width:800px){.custom-controls{grid-template-columns:1fr}}`}</style>
  </div>;
}

export function ReportTab({ tab }: { tab: string }) {
  return <>
    {tab === "Clients" ? <ClientsReport/> : tab === "Projects" ? <ProjectsReport/> : tab === "Financials" ? <FinancialsReport/> : tab === "Team" ? <TeamReport/> : tab === "Utilisation" ? <UtilisationReport/> : <CustomReport/>}
    <style jsx global>{`.report-stack{display:grid;gap:14px}.report-stack .kpi-grid{margin-bottom:0}`}</style>
  </>;
}
