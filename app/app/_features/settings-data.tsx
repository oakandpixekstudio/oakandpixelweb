"use client";

import { useRef, useState } from "react";
import { Database, Download, FileUp, RotateCcw, ScrollText, Upload } from "lucide-react";
import { Select } from "@/_components/controls";
import { useDialogs } from "@/_components/dialogs";
import { Pane, formatWhen } from "@/_features/settings-ui";
import { parseCsv, toCsv, downloadText } from "@/_lib/csv";
import { logAudit, readAudit } from "@/_lib/settings-store";
import type { AuditEntry } from "@/_lib/settings-store";
import { useDemoData } from "@/_providers/demo-data-provider";
import type { Client, Invoice } from "@/_types";

const invoiceTotal = (i: Invoice) => i.items.reduce((s, x) => s + x.quantity * x.unitPrice, 0) * (1 + i.taxRate / 100);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEMPLATE = toCsv(["name", "contact", "email", "phone", "industry", "service"], [["Example Co", "Jane Doe", "jane@example.co.za", "+27 82 000 0000", "Retail", "Website & CMS"]]);
const MAX_ROWS = 1000;

type ParsedRow = { line: number; client?: Client; error?: string };

export function DataImport() {
  const { clients, projects, tasks, invoices, emails, addClient, reset } = useDemoData();
  const { confirm, toast } = useDialogs();
  const picker = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [problem, setProblem] = useState("");

  const stamp = new Date().toISOString().slice(0, 10);
  const exports: { key: string; label: string; count: number; run: () => string }[] = [
    { key: "clients", label: "Clients", count: clients.length, run: () => toCsv(["Name", "Contact", "Email", "Phone", "Industry", "Service", "Status", "Pipeline (R)", "Billed (R)"], clients.map(c => [c.name, c.contact, c.email, c.phone, c.industry, c.service, c.status, c.pipeline, c.billed])) },
    { key: "projects", label: "Projects", count: projects.length, run: () => toCsv(["Name", "Client", "Service", "Stage", "Progress (%)", "Start", "Due", "Manager"], projects.map(p => [p.name, clients.find(c => c.id === p.clientId)?.name ?? "", p.service, p.stage, p.progress, p.start ?? "", p.due, p.manager])) },
    { key: "tasks", label: "Tasks", count: tasks.length, run: () => toCsv(["Title", "Project", "Assignee", "Priority", "Status", "Due"], tasks.map(t => [t.title, projects.find(p => p.id === t.projectId)?.name ?? "", t.assignee, t.priority, t.status, t.due])) },
    { key: "invoices", label: "Invoices", count: invoices.length, run: () => toCsv(["Invoice", "Client", "Status", "Issued", "Due", "Total (R)", "Paid (R)"], invoices.map(i => [i.id, clients.find(c => c.id === i.clientId)?.name ?? "", i.status, i.issueDate, i.dueDate, invoiceTotal(i).toFixed(2), i.paid])) },
    { key: "emails", label: "Emails", count: emails.length, run: () => toCsv(["From", "Subject", "Folder", "Time", "Client"], emails.map(m => [m.from, m.subject, m.folder, m.time, clients.find(c => c.id === m.clientId)?.name ?? ""])) },
  ];
  const doExport = (e: (typeof exports)[number]) => { downloadText(`oak-pixel-${e.key}-${stamp}.csv`, e.run()); logAudit("Data & Import", `Exported ${e.count} ${e.label.toLowerCase()} to CSV`); toast(`${e.label} exported`); };

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setProblem(""); setRows(null); setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) { setProblem("Choose a .csv file."); return; }
    if (file.size > 2 * 1024 * 1024) { setProblem("That file is larger than 2 MB."); return; }
    const table = parseCsv(await file.text());
    if (table.length < 2) { setProblem("The file needs a header row and at least one client."); return; }
    const header = table[0].map(h => h.trim().toLowerCase());
    const col = (name: string) => header.indexOf(name);
    if (col("name") < 0 || col("email") < 0) { setProblem("The header row must include “name” and “email” columns. Download the template to see the format."); return; }
    const existing = new Set(clients.map(c => c.email.toLowerCase()));
    const seen = new Set<string>();
    const parsed: ParsedRow[] = table.slice(1, MAX_ROWS + 1).map((cells, index) => {
      const get = (name: string) => (cells[col(name)] ?? "").trim();
      const name = get("name"); const email = get("email");
      if (!name) return { line: index + 2, error: "Missing name" };
      if (!EMAIL.test(email)) return { line: index + 2, error: `“${email || "(blank)"}” is not a valid email` };
      if (existing.has(email.toLowerCase()) || seen.has(email.toLowerCase())) return { line: index + 2, error: "Already exists" };
      seen.add(email.toLowerCase());
      const client: Client = { id: `import-${Date.now()}-${index}`, name, initials: name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join(""), service: get("service") || "Website & CMS", status: "Discovery", contact: get("contact") || name, email, phone: get("phone"), industry: get("industry") || "Other", pipeline: 0, billed: 0 };
      return { line: index + 2, client };
    });
    setRows(parsed);
    if (table.length - 1 > MAX_ROWS) setProblem(`Only the first ${MAX_ROWS} rows are read.`);
  };

  const valid = rows?.filter(r => r.client) ?? [];
  const skipped = rows?.filter(r => r.error) ?? [];
  const runImport = () => {
    valid.forEach(r => addClient(r.client!));
    logAudit("Data & Import", `Imported ${valid.length} clients from ${fileName}`);
    toast(`${valid.length} ${valid.length === 1 ? "client" : "clients"} imported`);
    setRows(null); setFileName("");
  };
  const wipe = async () => {
    if (!await confirm({ title: "Reset demo data?", message: "Every change in this browser (clients, projects, invoices, emails and more) is cleared and the sample data is restored.", confirmLabel: "Reset data", tone: "danger" })) return;
    logAudit("Data & Import", "Reset demonstration data"); reset(); toast("Demo data restored");
  };

  return <Pane title="Data & Import" subtitle="Move your information in and out of the workspace." icon={Database}>
    <div className="sp-section"><h3>Export</h3><p className="sp-note">Download your records as CSV files that open in Excel or Google Sheets.</p>
      <div className="sp-cards" style={{ marginTop: 8 }}>{exports.map(e => <div className="sp-card" key={e.key}><b style={{ fontWeight: 500 }}>{e.label}</b><p>{e.count} {e.count === 1 ? "record" : "records"}</p><button type="button" className="button" disabled={e.count === 0} onClick={() => doExport(e)}><Download size={15}/>Download CSV</button></div>)}</div></div>
    <div className="sp-section"><h3>Import clients</h3>
      <div className="sp-drop">
        <p className="sp-note">Upload a CSV with the columns <b>name</b> and <b>email</b>. <b>contact</b>, <b>phone</b>, <b>industry</b> and <b>service</b> are optional. Duplicates are skipped.</p>
        <div className="sp-tools"><input ref={picker} type="file" accept=".csv,text/csv" hidden onChange={e => { void choose(e.target.files?.[0]); e.target.value = ""; }}/>
          <button type="button" className="button" onClick={() => picker.current?.click()}><FileUp size={15}/>Choose CSV file</button>
          <button type="button" className="button" onClick={() => { downloadText("oak-pixel-client-import-template.csv", TEMPLATE); }}><Download size={15}/>Download template</button>
          {fileName && <small style={{ color: "var(--muted)" }}>{fileName}</small>}</div>
        {problem && <p className="field-error" role="alert" style={{ margin: 0 }}>{problem}</p>}
        {rows && <div style={{ display: "grid", gap: 10, width: "100%" }}>
          <p style={{ margin: 0 }}><b>{valid.length}</b> ready to import{skipped.length > 0 && <> · <b>{skipped.length}</b> skipped</>}</p>
          {valid.length > 0 && <div className="sp-table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Service</th></tr></thead><tbody>{valid.slice(0, 5).map(r => <tr key={r.line}><td>{r.client!.name}</td><td>{r.client!.email}</td><td>{r.client!.service}</td></tr>)}</tbody></table></div>}
          {valid.length > 5 && <small style={{ color: "var(--muted)" }}>…and {valid.length - 5} more</small>}
          {skipped.length > 0 && <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", fontSize: 12 }}>{skipped.slice(0, 5).map(r => <li key={r.line}>Row {r.line}: {r.error}</li>)}{skipped.length > 5 && <li>…and {skipped.length - 5} more</li>}</ul>}
          <div className="sp-tools"><button type="button" className="button primary" disabled={valid.length === 0} onClick={runImport}><Upload size={15}/>Import {valid.length} {valid.length === 1 ? "client" : "clients"}</button><button type="button" className="button" onClick={() => { setRows(null); setFileName(""); }}>Cancel</button></div>
        </div>}
      </div></div>
    <div className="sp-section"><h3>Reset</h3><div className="sp-row"><div><b>Restore the sample data</b><small>Clears everything you changed in this browser.</small></div><button type="button" className="button danger-ghost" onClick={() => void wipe()}><RotateCcw size={15}/>Reset demo data</button></div></div>
  </Pane>;
}

/* -------------------------------------------------------------- audit log */

const PAGE = 20;

export function AuditLog() {
  const [entries] = useState<AuditEntry[]>(() => readAudit());
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All areas");
  const [shown, setShown] = useState(PAGE);
  const areas = ["All areas", ...Array.from(new Set(entries.map(e => e.area))).sort()];
  const q = query.trim().toLowerCase();
  const filtered = entries.filter(e => (area === "All areas" || e.area === area) && (!q || `${e.actor} ${e.area} ${e.action}`.toLowerCase().includes(q)));
  const exportCsv = () => downloadText(`oak-pixel-audit-log-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(["When", "Who", "Area", "Event"], filtered.map(e => [formatWhen(e.time), e.actor, e.area, e.action])));

  return <Pane title="Audit Log" subtitle="A record of who changed what, and when." icon={ScrollText} action={<button type="button" className="button" onClick={exportCsv}><Download size={15}/>Export CSV</button>}>
    <div className="sp-tools">
      <input className="input" style={{ maxWidth: 280 }} aria-label="Search the audit log" placeholder="Search events or people" value={query} onChange={e => { setQuery(e.target.value); setShown(PAGE); }}/>
      <Select aria-label="Filter by area" value={area} style={{ minWidth: 170 }} onChange={e => { setArea(e.target.value); setShown(PAGE); }}>{areas.map(a => <option key={a}>{a}</option>)}</Select>
      <small style={{ color: "var(--muted)" }}>{filtered.length} {filtered.length === 1 ? "event" : "events"}</small>
    </div>
    <div className="sp-table-wrap"><table className="data-table">
      <thead><tr><th>When</th><th>Who</th><th>Area</th><th>Event</th></tr></thead>
      <tbody>{filtered.slice(0, shown).map(e => <tr key={e.id}><td style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>{formatWhen(e.time)}</td><td style={{ whiteSpace: "nowrap" }}>{e.actor}</td><td><span className="badge">{e.area}</span></td><td style={{ padding: "10px 12px" }}>{e.action}</td></tr>)}</tbody>
    </table>{filtered.length === 0 && <div className="empty" style={{ minHeight: 120 }}>No events match.</div>}</div>
    {filtered.length > shown && <button type="button" className="button" style={{ justifySelf: "start" }} onClick={() => setShown(n => n + PAGE)}>Show more</button>}
    <p className="sp-note">Changes made in Settings are recorded here. The earlier entries are sample events for the demonstration.</p>
  </Pane>;
}
