"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Building2, ExternalLink, FolderKanban, Mail, Pencil, Phone, Plus, Star, Trash2, Users } from "lucide-react";
import { ClientLogo, PageHero, Pagination, Panel, SearchBox, StatusBadge, Money, Progress, TableCheckbox, useRowLink, ViewToggle } from "@/_components/shared";
import { Select } from "@/_components/controls";
import { RecordForm, type FieldDef, type FormValues } from "@/_components/record-form";
import { RowMenu } from "@/_components/row-menu";
import { useDemoData } from "@/_providers/demo-data-provider";
import { useDialogs } from "@/_components/dialogs";
import type { Client, ClientContact, ClientStatus } from "@/_types";

const clientFields: FieldDef[] = [
  { name: "name", label: "Organisation name", required: true, wide: true },
  { name: "service", label: "Service", required: true, placeholder: "e.g. Website & CMS" },
  { name: "status", label: "Status", type: "select", options: ["Active", "Proposal", "Discovery", "On Hold"] },
  { name: "industry", label: "Industry", required: true },
  { name: "contact", label: "Primary contact", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", required: true },
  { name: "pipeline", label: "Pipeline value (R)", type: "number", min: 0 },
  { name: "billed", label: "Total billed (R)", type: "number", min: 0 },
];
const contactFields: FieldDef[] = [
  { name: "name", label: "Full name", required: true, wide: true },
  { name: "role", label: "Role", placeholder: "e.g. Head of Marketing" },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "tel" },
  { name: "primary", label: "Primary contact for this client", type: "checkbox" },
];

const initialsOf = (name: string) => name.split(/\s+/).map(s => s[0]).join("").slice(0, 2).toUpperCase();

/** A client's contacts. Older records only carry the single primary contact fields. */
export function contactsOf(client: Client): ClientContact[] {
  return client.contacts?.length ? client.contacts : [{ id: `${client.id}-primary`, name: client.contact, role: "Primary contact", email: client.email, phone: client.phone, primary: true }];
}

function applyContacts(client: Client, contacts: ClientContact[]): Client {
  const list = contacts.some(c => c.primary) ? contacts : contacts.map((c, i) => ({ ...c, primary: i === 0 }));
  const primary = list.find(c => c.primary) ?? list[0];
  return { ...client, contacts: list, contact: primary?.name ?? client.contact, email: primary?.email ?? client.email, phone: primary?.phone ?? client.phone };
}

type SortKey = "name" | "service" | "projects" | "pipeline" | "status";
type FormState = { mode: "new" } | { mode: "edit"; client: Client } | null;

function useClientActions() {
  const { projects, tasks, opportunities, invoices, emails, upsertClient, deleteClient } = useDemoData();
  const { confirm, toast } = useDialogs();
  const save = (values: FormValues, existing?: Client) => {
    const name = String(values.name).trim();
    const base: Client = existing ?? { id: crypto.randomUUID(), name, initials: initialsOf(name), service: "", status: "Active", contact: "", email: "", phone: "", industry: "", pipeline: 0, billed: 0, since: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) };
    const next = { ...base, name, initials: initialsOf(name), service: String(values.service), status: values.status as ClientStatus, industry: String(values.industry), pipeline: Number(values.pipeline), billed: Number(values.billed) };
    const contacts = contactsOf({ ...next, contact: String(values.contact), email: String(values.email), phone: String(values.phone) });
    const withPrimary = contacts.map(c => c.primary ? { ...c, name: String(values.contact), email: String(values.email), phone: String(values.phone) } : c);
    upsertClient(applyContacts(next, withPrimary));
    toast(existing ? `${name} updated` : `${name} added`);
    return next.id;
  };
  const remove = async (client: Client) => {
    const projectIds = projects.filter(p => p.clientId === client.id).map(p => p.id);
    const counts = [
      [projectIds.length, "project"], [tasks.filter(t => projectIds.includes(t.projectId)).length, "task"],
      [opportunities.filter(o => o.clientId === client.id).length, "opportunity"], [invoices.filter(i => i.clientId === client.id).length, "invoice"], [emails.filter(e => e.clientId === client.id).length, "email"],
    ].filter(([n]) => Number(n) > 0).map(([n, noun]) => `${n} ${noun}${Number(n) === 1 ? "" : noun === "opportunity" ? "" : "s"}`.replace("opportunitys", "opportunities"));
    const ok = await confirm({ title: `Delete ${client.name}?`, message: counts.length ? `This also permanently removes ${counts.join(", ")}. This can’t be undone.` : "This can’t be undone.", confirmLabel: "Delete client", tone: "danger" });
    if (ok) { deleteClient(client.id); toast(`${client.name} deleted`); }
    return ok;
  };
  return { save, remove };
}

const toInitial = (client?: Client): Partial<FormValues> | undefined => client && ({ name: client.name, service: client.service, status: client.status, industry: client.industry, contact: client.contact, email: client.email, phone: client.phone, pipeline: client.pipeline, billed: client.billed });

export function ClientsView() {
  const router = useRouter();
  const { clients, projects } = useDemoData();
  const rowLink = useRowLink();
  const { save, remove } = useClientActions();
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("All Statuses"); const [service, setService] = useState("All Services"); const [scope, setScope] = useState("All Clients");
  const [selected, setSelected] = useState(clients[0]?.id); const [form, setForm] = useState<FormState>(null);
  const [view, setView] = useState<"list" | "grid">("list"); const [page, setPage] = useState(1); const [checked, setChecked] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const pageSize = 8;
  const activeCount = (id: string) => projects.filter(p => p.clientId === id && p.stage !== "Completed").length;
  const services = Array.from(new Set(clients.map(c => c.service)));
  const filtered = clients.filter(c => (c.name + c.service + c.contact).toLowerCase().includes(query.toLowerCase()) && (status === "All Statuses" || c.status === status) && (service === "All Services" || c.service === service) && (scope === "All Clients" || (scope === "With active projects" ? activeCount(c.id) > 0 : activeCount(c.id) === 0)));
  const value = (c: Client, key: SortKey) => key === "name" ? c.name : key === "service" ? c.service : key === "projects" ? activeCount(c.id) : key === "pipeline" ? c.pipeline : c.status;
  const rows = sort ? [...filtered].sort((a, b) => { const x = value(a, sort.key), y = value(b, sort.key); return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * sort.dir; }) : filtered;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize)); const current = Math.min(page, pages); const pageRows = rows.slice((current - 1) * pageSize, current * pageSize);
  const client = clients.find(c => c.id === selected) ?? pageRows[0];
  const sortBy = (key: SortKey) => { setSort(s => s?.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }); setPage(1); };
  const allChecked = pageRows.length > 0 && pageRows.every(c => checked.includes(c.id));
  const th = (k: SortKey, label: string, icon: "up" | "down") => <th><button type="button" className="th-sort" onClick={() => sortBy(k)}>{label}{sort?.key === k ? (sort.dir === 1 ? <ArrowUp size={13}/> : <ArrowDown size={13}/>) : icon === "up" ? <ArrowUp size={13}/> : <ArrowDown size={13}/>}</button></th>;
  const menuFor = (c: Client) => <RowMenu label={`Actions for ${c.name}`} items={[
    { label: "Open client", icon: ExternalLink, onClick: () => router.push(`/clients/${c.id}`) },
    { label: "Edit details", icon: Pencil, onClick: () => setForm({ mode: "edit", client: c }) },
    { label: "Delete client", icon: Trash2, tone: "danger", separatorBefore: true, onClick: () => { void remove(c); } },
  ]}/>;
  return <>
    <PageHero eyebrow="Clients" title="Clients" subtitle="Manage your client relationships, projects and communication."/>
    <div className="toolbar"><SearchBox value={query} onChange={v => { setQuery(v); setPage(1); }} placeholder="Search clients…"/>
      <Select className="select" aria-label="Client scope" value={scope} onChange={e => { setScope(e.target.value); setPage(1); }}><option>All Clients</option><option>With active projects</option><option>No active projects</option></Select>
      <Select className="select" aria-label="Status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option>All Statuses</option><option>Active</option><option>Proposal</option><option>Discovery</option><option>On Hold</option></Select>
      <Select className="select" aria-label="Service" value={service} onChange={e => { setService(e.target.value); setPage(1); }}><option>All Services</option>{services.map(s => <option key={s}>{s}</option>)}</Select>
      <ViewToggle value={view} onChange={setView}/><span style={{ flex: 1 }}/><button className="button primary" onClick={() => setForm({ mode: "new" })}><Plus size={17}/>Add Client</button></div>
    <div className="split">
      <section className="panel">
        {view === "list" ? <div className="table-wrap"><table className="data-table"><thead><tr><th style={{ width: 44 }}><TableCheckbox label="Select all clients" checked={allChecked} onChange={on => setChecked(on ? Array.from(new Set([...checked, ...pageRows.map(c => c.id)])) : checked.filter(id => !pageRows.some(c => c.id === id)))}/></th>{th("name", "Client", "up")}{th("service", "Service", "down")}{th("projects", "Active Projects", "down")}{th("pipeline", "Value (Pipeline)", "up")}{th("status", "Status", "down")}<th/></tr></thead>
          <tbody>{pageRows.map(c => <tr key={c.id} className={`${c.id === client?.id ? "selected" : ""} clickable`} onMouseEnter={() => setSelected(c.id)} {...rowLink(`/clients/${c.id}`)}><td><TableCheckbox label={`Select ${c.name}`} checked={checked.includes(c.id)} onChange={on => setChecked(on ? [...checked, c.id] : checked.filter(id => id !== c.id))}/></td><td><span className="client-cell"><ClientLogo id={c.id} initials={c.initials}/><strong>{c.name}</strong></span></td><td>{c.service}</td><td>{activeCount(c.id)}</td><td><Money value={c.pipeline}/></td><td><StatusBadge value={c.status}/></td><td>{menuFor(c)}</td></tr>)}</tbody></table></div>
          : <div className="card-grid">{pageRows.map(c => <button type="button" key={c.id} className={`card-tile ${c.id === client?.id ? "selected" : ""}`} onMouseEnter={() => setSelected(c.id)} onClick={rowLink(`/clients/${c.id}`).onClick}><span className="client-cell"><ClientLogo id={c.id} initials={c.initials}/><strong>{c.name}</strong></span><span style={{ color: "var(--muted)" }}>{c.service}</span><span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Money value={c.pipeline}/><StatusBadge value={c.status}/></span></button>)}</div>}
        {pageRows.length === 0 && <div className="empty" style={{ minHeight: 180 }}>No clients match these filters.</div>}
        <Pagination page={current} pageSize={pageSize} total={rows.length} noun="clients" onPage={setPage}/>
      </section>
      {client && <ClientInspector client={client} menu={menuFor(client)}/>}
    </div>
    {form && <RecordForm title={form.mode === "new" ? "Add client" : `Edit ${form.client.name}`} subtitle={form.mode === "new" ? "Create a client record." : "Update this client’s details."} fields={clientFields} onClose={() => setForm(null)}
      initial={toInitial(form.mode === "edit" ? form.client : undefined)} submitLabel={form.mode === "new" ? "Create client" : "Save changes"}
      onSubmit={values => { const id = save(values, form.mode === "edit" ? form.client : undefined); setSelected(id); setForm(null); }}
      onDelete={form.mode === "edit" ? async () => { if (await remove(form.client)) setForm(null); } : undefined} deleteLabel="Delete client"/>}
    <style jsx>{`.client-cell{display:flex;align-items:center;gap:11px;min-width:190px}.split>.panel:first-child{min-height:520px}@media(max-width:850px){.split>.panel:first-child{order:2}}`}</style>
  </>;
}

function ClientInspector({ client, menu }: { client: Client; menu: React.ReactNode }) {
  const { projects } = useDemoData();
  const active = projects.filter(p => p.clientId === client.id && p.stage !== "Completed");
  const [t, setT] = useState("Overview");
  return <Panel>
    <div className="detail-title"><ClientLogo id={client.id} initials={client.initials}/><div><h2><Link href={`/clients/${client.id}`}>{client.name}</Link></h2><small style={{ color: "var(--muted)" }}>Client since {client.since ?? "—"}</small></div><span style={{ marginLeft: "auto" }}>{menu}</span></div>
    <div className="tabs" style={{ margin: "14px -18px 14px" }}>{["Overview", "Projects", "Communication", "Invoices", "Files"].map(x => <button key={x} className={`tab ${t === x ? "active" : ""}`} onClick={() => setT(x)}>{x}</button>)}</div>
    {t === "Overview" ? <>
      <div className="info-grid"><div className="info-box"><label>Status</label><StatusBadge value={client.status}/></div><div className="info-box"><label>Active Projects</label><b>{active.length}</b></div><div className="info-box"><label>Pipeline Value</label><span className="section-title"><Money value={client.pipeline}/></span></div><div className="info-box"><label>Total Billed</label><span className="section-title"><Money value={client.billed}/></span></div></div>
      <div className="contact-list"><p><Users size={16}/><span>Primary Contact</span><b>{client.contact}</b></p><p><Mail size={16}/><span>Email</span><b>{client.email}</b></p><p><Phone size={16}/><span>Phone</span><b>{client.phone}</b></p><p><Building2 size={16}/><span>Industry</span><b>{client.industry}</b></p></div>
    </> : t === "Projects" ? <div>{active.map(p => <Link className="related-row" href={`/projects/${p.id}`} key={p.id}><FolderKanban size={17}/><span><b>{p.name}</b><small>{p.service}</small></span><Progress value={p.progress}/></Link>)}{active.length === 0 && <div className="empty" style={{ minHeight: 120 }}>No active projects.</div>}</div>
      : <div className="empty"><p>{t} uses shared demonstration records.<br/>No live service is connected.</p></div>}
    <Link href="/emails" className="button outline" style={{ width: "100%" }}><Mail size={16}/>Send Email</Link>
    <style jsx>{`.contact-list{margin:12px 0}.contact-list p{display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--line);padding:9px 2px;margin:0}.contact-list span{color:var(--muted)}.contact-list b{margin-left:auto;font-size:12px}.related-row{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--line)}.related-row span{display:flex;flex-direction:column;flex:1}.related-row small{color:var(--muted)}`}</style>
  </Panel>;
}

export function ClientDetailView({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { clients, projects, emails, invoices, upsertClient } = useDemoData();
  const { save, remove } = useClientActions();
  const { confirm, toast } = useDialogs();
  const client = clients.find(c => c.id === clientId);
  const [tab, setTab] = useState("Overview");
  const [form, setForm] = useState<FormState>(null);
  const [contactForm, setContactForm] = useState<{ contact?: ClientContact } | null>(null);
  const tabs = ["Overview", "Projects", "Communication", "Invoices", "Contacts", "Files", "Activity", "Notes"];
  if (!client) return <><PageHero eyebrow="Clients" title="Client not found" subtitle="This client may have been deleted."/><Link href="/clients" className="button"><ArrowLeft size={16}/>Back to clients</Link></>;
  const contacts = contactsOf(client);

  const saveContact = (values: FormValues, existing?: ClientContact) => {
    const contact: ClientContact = { id: existing?.id ?? crypto.randomUUID(), name: String(values.name).trim(), role: String(values.role), email: String(values.email).trim(), phone: String(values.phone), primary: Boolean(values.primary) };
    const others = contacts.filter(c => c.id !== contact.id).map(c => contact.primary ? { ...c, primary: false } : c);
    const next = existing ? contacts.map(c => c.id === contact.id ? contact : (contact.primary ? { ...c, primary: false } : c)) : [...others, contact];
    upsertClient(applyContacts(client, next));
    toast(existing ? `${contact.name} updated` : `${contact.name} added`);
  };
  const removeContact = async (contact: ClientContact) => {
    if (contacts.length === 1) { toast("A client needs at least one contact. Add another before deleting this one.", "error"); return; }
    if (await confirm({ title: `Delete ${contact.name}?`, message: contact.primary ? "This is the primary contact. The next contact will become primary." : "This contact will be removed from this client.", confirmLabel: "Delete contact", tone: "danger" })) {
      upsertClient(applyContacts(client, contacts.filter(c => c.id !== contact.id))); toast(`${contact.name} deleted`);
    }
  };
  const makePrimary = (contact: ClientContact) => { upsertClient(applyContacts(client, contacts.map(c => ({ ...c, primary: c.id === contact.id })))); toast(`${contact.name} is now the primary contact`); };

  return <>
    <PageHero eyebrow="Clients / Client workspace" title={client.name} subtitle={`${client.industry} · ${client.service}`}/>
    <div className="toolbar"><Link href="/clients" className="button"><ArrowLeft size={16}/>Clients</Link><span style={{ flex: 1 }}/>
      <button className="button" onClick={() => setForm({ mode: "edit", client })}><Pencil size={16}/>Edit client</button>
      <button className="button danger-ghost" onClick={async () => { if (await remove(client)) router.push("/clients"); }}><Trash2 size={16}/>Delete</button>
      <Link href="/emails" className="button primary"><Mail size={16}/>Send Email</Link></div>
    <div className="tabs page-tabs">{tabs.map(x => <button key={x} className={`tab ${tab === x ? "active" : ""}`} onClick={() => setTab(x)}>{x}</button>)}</div>
    {tab === "Overview" ? <div className="detail-grid">
      <Panel title="Client overview"><div className="info-grid"><div className="info-box"><label>Status</label><StatusBadge value={client.status}/></div><div className="info-box"><label>Primary contact</label><b>{client.contact}</b></div><div className="info-box"><label>Email</label><b>{client.email}</b></div><div className="info-box"><label>Phone</label><b>{client.phone}</b></div></div></Panel>
      <Panel title="Commercial summary"><div className="info-grid"><div className="info-box"><label>Pipeline</label><span className="section-title"><Money value={client.pipeline}/></span></div><div className="info-box"><label>Total billed</label><span className="section-title"><Money value={client.billed}/></span></div></div></Panel>
      <Panel title="Active projects" className="wide">{projects.filter(p => p.clientId === client.id).map(p => <Link href={`/projects/${p.id}`} className="related-row" key={p.id}><FolderKanban size={17}/><span><b>{p.name}</b><small>{p.service} · {p.due}</small></span><StatusBadge value={p.stage}/></Link>)}</Panel>
    </div>
    : tab === "Contacts" ? <section className="panel">
      <header className="panel-header"><h2 className="section-title">Contacts</h2><button className="button primary" onClick={() => setContactForm({})}><Plus size={16}/>Add contact</button></header>
      {contacts.map(c => <div className="contact-row" key={c.id}>
        <span className="avatar">{initialsOf(c.name)}</span>
        <span className="contact-main"><b>{c.name} {c.primary && <span className="badge green" style={{ marginLeft: 6 }}>Primary</span>}</b><small>{c.role || "—"}</small></span>
        <span className="contact-meta"><span>{c.email}</span><span>{c.phone || "—"}</span></span>
        <RowMenu label={`Actions for ${c.name}`} items={[
          { label: "Edit contact", icon: Pencil, onClick: () => setContactForm({ contact: c }) },
          ...(c.primary ? [] : [{ label: "Make primary", icon: Star, onClick: () => makePrimary(c) }]),
          { label: "Delete contact", icon: Trash2, tone: "danger" as const, separatorBefore: true, onClick: () => { void removeContact(c); } },
        ]}/>
      </div>)}
    </section>
    : tab === "Projects" ? <RecordTable rows={projects.filter(p => p.clientId === client.id).map(p => [p.name, p.service, p.stage, p.due])} headers={["Project", "Service", "Status", "Due"]}/>
    : tab === "Communication" ? <RecordTable rows={emails.filter(e => e.clientId === client.id).map(e => [e.subject, e.from, e.folder, e.time])} headers={["Subject", "From", "Folder", "Date"]}/>
    : tab === "Invoices" ? <RecordTable rows={invoices.filter(i => i.clientId === client.id).map(i => [i.id, i.status, i.issueDate, i.dueDate])} headers={["Invoice", "Status", "Issued", "Due"]}/>
    : <Panel title={tab}><div className="empty">Demonstration {tab.toLowerCase()} workspace. Additions remain in local frontend state only.</div></Panel>}
    {form?.mode === "edit" && <RecordForm title={`Edit ${client.name}`} subtitle="Update this client’s details." fields={clientFields} onClose={() => setForm(null)} initial={toInitial(client)} submitLabel="Save changes" onSubmit={values => { save(values, client); setForm(null); }}/>}
    {contactForm && <RecordForm title={contactForm.contact ? `Edit ${contactForm.contact.name}` : "Add contact"} subtitle={client.name} fields={contactFields} onClose={() => setContactForm(null)}
      initial={contactForm.contact ? { name: contactForm.contact.name, role: contactForm.contact.role, email: contactForm.contact.email, phone: contactForm.contact.phone, primary: contactForm.contact.primary } : { primary: contacts.length === 0 }}
      submitLabel={contactForm.contact ? "Save contact" : "Add contact"} onSubmit={values => { saveContact(values, contactForm.contact); setContactForm(null); }}
      onDelete={contactForm.contact ? async () => { const target = contactForm.contact; if (target) { await removeContact(target); setContactForm(null); } } : undefined} deleteLabel="Delete contact"/>}
    <style jsx>{`.page-tabs{margin-bottom:14px;background:var(--panel);border:1px solid var(--border)}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.wide{grid-column:1/-1}.related-row{display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid var(--line)}.related-row span{display:flex;flex-direction:column;flex:1}.related-row small{color:var(--muted)}@media(max-width:800px){.detail-grid{grid-template-columns:1fr}.wide{grid-column:auto}}`}</style>
  </>;
}

function RecordTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <section className="panel table-wrap"><table className="data-table"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <div className="empty" style={{ minHeight: 120 }}>Nothing here yet.</div>}</section>;
}
