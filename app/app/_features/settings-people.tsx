"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Layers, Lock, Pencil, Plus, ShieldCheck, Tag, Trash2, UserCheck, UserMinus, Users, Send } from "lucide-react";
import { Select } from "@/_components/controls";
import { useDialogs } from "@/_components/dialogs";
import { RecordForm } from "@/_components/record-form";
import type { FormValues } from "@/_components/record-form";
import { RowMenu } from "@/_components/row-menu";
import { Pane, Switch, money } from "@/_features/settings-ui";
import { logAudit, usePersisted } from "@/_lib/settings-store";

/* ------------------------------------------------------------------ roles */

export const MODULES = ["Clients", "Projects", "Pipeline", "Tasks", "Emails", "Templates", "Invoices", "Reports", "Website Audit", "Settings"] as const;
const ACTIONS = ["view", "create", "edit", "delete"] as const;
type Action = (typeof ACTIONS)[number];
type Perms = Record<string, Record<Action, boolean>>;
export type Role = { id: string; name: string; description: string; system: boolean; perms: Perms };

const grid = (rule: (module: string, action: Action) => boolean): Perms =>
  Object.fromEntries(MODULES.map(m => [m, Object.fromEntries(ACTIONS.map(a => [a, rule(m, a)])) as Record<Action, boolean>]));

export const DEFAULT_ROLES: Role[] = [
  { id: "owner", name: "Owner", description: "Full control, including billing and deleting the workspace.", system: true, perms: grid(() => true) },
  { id: "admin", name: "Admin", description: "Manages people and settings. Cannot delete the workspace.", system: true, perms: grid((m, a) => !(m === "Settings" && a === "delete")) },
  { id: "manager", name: "Manager", description: "Runs clients, projects and the pipeline day to day.", system: true, perms: grid((m, a) => ["Clients", "Projects", "Pipeline", "Tasks", "Emails", "Templates"].includes(m) ? a !== "delete" || m === "Tasks" : ["Invoices", "Website Audit"].includes(m) ? a !== "delete" : m === "Reports" && a === "view") },
  { id: "member", name: "Member", description: "Works on assigned projects and tasks.", system: true, perms: grid((m, a) => (m === "Tasks" && a !== "delete") || (m === "Projects" && (a === "view" || a === "edit")) || (["Clients", "Pipeline"].includes(m) && a === "view") || (m === "Emails" && (a === "view" || a === "create"))) },
  { id: "viewer", name: "Viewer", description: "Read-only access to clients, projects and reports.", system: true, perms: grid((m, a) => a === "view" && ["Clients", "Projects", "Pipeline", "Tasks", "Reports"].includes(m)) },
];

export type Member = { id: string; name: string; email: string; role: string; status: "Active" | "Invited" | "Disabled"; last: string };
const DEFAULT_MEMBERS: Member[] = [
  { id: "m1", name: "Oak & Pixel Admin", email: "info@oakandpixel.co.za", role: "Owner", status: "Active", last: "Today" },
  { id: "m2", name: "Lerato Maseko", email: "lerato@oakandpixel.co.za", role: "Manager", status: "Active", last: "Today" },
  { id: "m3", name: "Thandi Moyo", email: "thandi@oakandpixel.co.za", role: "Member", status: "Active", last: "Yesterday" },
  { id: "m4", name: "Sizwe Dlamini", email: "sizwe@oakandpixel.co.za", role: "Member", status: "Active", last: "2 days ago" },
  { id: "m5", name: "Naledi Bhengu", email: "naledi@oakandpixel.co.za", role: "Viewer", status: "Invited", last: "Never" },
];

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "?";

export function PeopleAccess() {
  const { confirm, toast } = useDialogs();
  const [members, setMembers] = usePersisted<Member[]>("members", DEFAULT_MEMBERS);
  const [roles] = usePersisted<Role[]>("roles", DEFAULT_ROLES);
  const [form, setForm] = useState<{ mode: "invite" } | { mode: "edit"; member: Member } | null>(null);
  const roleNames = roles.map(r => r.name);
  const assignable = roleNames.filter(r => r !== "Owner");
  const taken = (email: string, ignore?: string) => members.some(m => m.email.toLowerCase() === email.trim().toLowerCase() && m.id !== ignore);

  const setRole = (member: Member, role: string) => { setMembers(list => list.map(m => m.id === member.id ? { ...m, role } : m)); logAudit("People & Access", `Changed ${member.name}'s role to ${role}`); toast(`${member.name} is now ${role}`); };
  const toggle = (member: Member) => { const next = member.status === "Disabled" ? "Active" : "Disabled"; setMembers(list => list.map(m => m.id === member.id ? { ...m, status: next } : m)); logAudit("People & Access", `${next === "Active" ? "Re-enabled" : "Disabled"} ${member.name}`); toast(`${member.name} ${next === "Active" ? "can sign in again" : "can no longer sign in"}`); };
  const remove = async (member: Member) => {
    if (!await confirm({ title: `Remove ${member.name}?`, message: "They will lose access to the workspace immediately.", confirmLabel: "Remove", tone: "danger" })) return;
    setMembers(list => list.filter(m => m.id !== member.id)); logAudit("People & Access", `Removed ${member.name}`); toast(`${member.name} removed`);
  };
  const submit = (values: FormValues) => {
    const name = String(values.name).trim(); const email = String(values.email).trim(); const role = String(values.role);
    if (form?.mode === "edit") {
      if (taken(email, form.member.id)) { toast("Someone else already uses that email address", "error"); return; }
      setMembers(list => list.map(m => m.id === form.member.id ? { ...m, name, email, role: m.role === "Owner" ? "Owner" : role } : m)); logAudit("People & Access", `Updated details for ${name}`); toast("Details saved");
    } else {
      if (taken(email)) { toast("That email address is already on the team", "error"); return; }
      setMembers(list => [...list, { id: `m${Date.now()}`, name, email, role, status: "Invited", last: "Never" }]); logAudit("People & Access", `Invited ${name} as ${role}`);
      toast("Invitation recorded. No email is sent in this demonstration.");
    }
    setForm(null);
  };

  const active = members.filter(m => m.status === "Active").length;
  return <Pane title="People & Access" subtitle="Invite teammates and control who can sign in and what they can do." icon={Users} action={<button type="button" className="button primary" onClick={() => setForm({ mode: "invite" })}><Plus size={16}/>Invite person</button>}>
    <p className="sp-note">{active} active · {members.filter(m => m.status === "Invited").length} invited · {members.filter(m => m.status === "Disabled").length} disabled</p>
    <div className="sp-table-wrap"><table className="data-table">
      <thead><tr><th>Person</th><th>Role</th><th>Status</th><th>Last active</th><th style={{ width: 48 }}/></tr></thead>
      <tbody>{members.map(m => <tr key={m.id}>
        <td><div className="sp-user"><span className="sp-avatar">{initials(m.name)}</span><span><b style={{ fontWeight: 500 }}>{m.name}</b><small>{m.email}</small></span></div></td>
        <td>{m.role === "Owner" ? <span className="badge"><Lock size={12}/>Owner</span> : <Select aria-label={`Role for ${m.name}`} value={m.role} style={{ minWidth: 130 }} onChange={e => setRole(m, e.target.value)}>{assignable.map(r => <option key={r}>{r}</option>)}</Select>}</td>
        <td><span className={`badge ${m.status === "Active" ? "green" : m.status === "Invited" ? "warning" : "danger"}`}>{m.status}</span></td>
        <td style={{ color: "var(--muted)" }}>{m.last}</td>
        <td>{m.role !== "Owner" && <RowMenu label={`Actions for ${m.name}`} items={[
          { label: "Edit details", icon: Pencil, onClick: () => setForm({ mode: "edit", member: m }) },
          ...(m.status === "Invited" ? [{ label: "Resend invitation", icon: Send, onClick: () => { logAudit("People & Access", `Resent invitation to ${m.name}`); toast("Invitation recorded again. No email is sent in this demonstration."); } }] : []),
          { label: m.status === "Disabled" ? "Re-enable access" : "Disable access", icon: m.status === "Disabled" ? UserCheck : UserMinus, onClick: () => toggle(m) },
          { label: "Remove from team", icon: Trash2, tone: "danger" as const, separatorBefore: true, onClick: () => void remove(m) },
        ]}/>}</td>
      </tr>)}</tbody>
    </table></div>
    <p className="sp-note">Demonstration: the team list is stored in this browser. Real sign-in accounts are not created yet.</p>
    {form && <RecordForm title={form.mode === "invite" ? "Invite person" : "Edit person"} subtitle={form.mode === "invite" ? "They are added as Invited until they accept." : form.member.name}
      submitLabel={form.mode === "invite" ? "Send invitation" : "Save"} onClose={() => setForm(null)} onSubmit={submit}
      initial={form.mode === "edit" ? { name: form.member.name, email: form.member.email, role: form.member.role === "Owner" ? assignable[0] ?? "Member" : form.member.role } : { role: assignable.includes("Member") ? "Member" : assignable[0] ?? "Member" }}
      fields={[{ name: "name", label: "Full name", required: true }, { name: "email", label: "Email address", type: "email", required: true }, ...(form.mode === "edit" && form.member.role === "Owner" ? [] : [{ name: "role", label: "Role", type: "select" as const, options: assignable }])]}/>}
  </Pane>;
}

/* ------------------------------------------------------------ permissions */

export function RolesPermissions() {
  const { confirm, toast } = useDialogs();
  const [roles, setRoles] = usePersisted<Role[]>("roles", DEFAULT_ROLES);
  const [members] = usePersisted<Member[]>("members", DEFAULT_MEMBERS);
  const [selectedId, setSelectedId] = useState(roles[0]?.id ?? "owner");
  const [form, setForm] = useState<"new" | "edit" | null>(null);
  const role = roles.find(r => r.id === selectedId) ?? roles[0];
  const locked = role.id === "owner";
  const assigned = members.filter(m => m.role === role.name).length;

  const setPerm = (module: string, action: Action, value: boolean) => {
    setRoles(list => list.map(r => {
      if (r.id !== role.id) return r;
      const current = { ...r.perms[module] };
      current[action] = value;
      if (action === "view" && !value) { current.create = false; current.edit = false; current.delete = false; }
      if (action !== "view" && value) current.view = true;
      return { ...r, perms: { ...r.perms, [module]: current } };
    }));
  };
  const save = () => { logAudit("Roles & Permissions", `Updated permissions for ${role.name}`); toast(`${role.name} permissions saved`); };
  const preset = (rule: (m: string, a: Action) => boolean, label: string) => { setRoles(list => list.map(r => r.id === role.id ? { ...r, perms: grid(rule) } : r)); logAudit("Roles & Permissions", `Set ${role.name} to ${label}`); toast(`${role.name} set to ${label}`); };
  const create = (values: FormValues) => {
    const name = String(values.name).trim();
    if (roles.some(r => r.name.toLowerCase() === name.toLowerCase())) { toast("A role with that name already exists", "error"); return; }
    const source = roles.find(r => r.id === values.from) ?? roles[roles.length - 1];
    const next: Role = { id: `r${Date.now()}`, name, description: String(values.description).trim(), system: false, perms: JSON.parse(JSON.stringify(source.perms)) };
    setRoles(list => [...list, next]); setSelectedId(next.id); setForm(null); logAudit("Roles & Permissions", `Created role ${name}`); toast(`Role “${name}” created`);
  };
  const rename = (values: FormValues) => { setRoles(list => list.map(r => r.id === role.id ? { ...r, name: String(values.name).trim(), description: String(values.description).trim() } : r)); setForm(null); logAudit("Roles & Permissions", `Renamed role ${role.name}`); toast("Role updated"); };
  const remove = async () => {
    if (assigned > 0) { toast(`${assigned} ${assigned === 1 ? "person has" : "people have"} this role. Move them to another role first.`, "error"); return; }
    if (!await confirm({ title: `Delete the ${role.name} role?`, message: "This cannot be undone.", confirmLabel: "Delete role", tone: "danger" })) return;
    setRoles(list => list.filter(r => r.id !== role.id)); setSelectedId("owner"); logAudit("Roles & Permissions", `Deleted role ${role.name}`); toast("Role deleted");
  };

  return <Pane title="Roles & Permissions" subtitle="Decide what each role can see and do in every part of the workspace." icon={ShieldCheck} action={<button type="button" className="button primary" onClick={() => setForm("new")}><Plus size={16}/>New role</button>}>
    <div className="sp-two">
      <div className="sp-list" role="listbox" aria-label="Roles">{roles.map(r => <button key={r.id} type="button" role="option" aria-selected={r.id === role.id} className={r.id === role.id ? "active" : ""} onClick={() => setSelectedId(r.id)}><b style={{ fontWeight: 500 }}>{r.name}{r.system ? "" : " · custom"}</b><small>{members.filter(m => m.role === r.name).length} {members.filter(m => m.role === r.name).length === 1 ? "person" : "people"}</small></button>)}</div>
      <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
        <div className="sp-tools"><div style={{ flex: 1, minWidth: 200 }}><b style={{ fontWeight: 500 }}>{role.name}</b><small style={{ display: "block", color: "var(--muted)" }}>{role.description}</small></div>
          {!locked && <><button type="button" className="button" onClick={() => preset((_m, a) => a === "view", "view only")}>View only</button><button type="button" className="button" onClick={() => preset(() => true, "full access")}>Full access</button></>}
          {!role.system && <><button type="button" className="icon-button" aria-label="Rename role" onClick={() => setForm("edit")}><Pencil size={16}/></button><button type="button" className="icon-button" aria-label="Delete role" onClick={() => void remove()}><Trash2 size={16}/></button></>}</div>
        <div className="sp-table-wrap"><table className="sp-matrix"><thead><tr><th>Area</th>{ACTIONS.map(a => <th key={a} style={{ textTransform: "capitalize" }}>{a}</th>)}</tr></thead>
          <tbody>{MODULES.map(m => <tr key={m}><td>{m}</td>{ACTIONS.map(a => <td key={a}><input type="checkbox" className="check" aria-label={`${role.name}: ${a} ${m}`} checked={role.perms[m]?.[a] ?? false} disabled={locked} onChange={e => setPerm(m, a, e.target.checked)}/></td>)}</tr>)}</tbody></table></div>
        <div className="sp-savebar">{locked ? <span><Lock size={13} style={{ verticalAlign: -2 }}/> The Owner role always has full access and cannot be changed.</span> : <><span>Changes apply as you tick them.</span><span style={{ flex: 1 }}/><button type="button" className="button primary" onClick={save}>Save permissions</button></>}</div>
      </div>
    </div>
    <p className="sp-note">Demonstration: permissions are recorded here but not yet enforced, because the workspace has a single shared sign-in.</p>
    {form === "new" && <RecordForm title="New role" subtitle="Start from an existing role, then adjust." submitLabel="Create role" onClose={() => setForm(null)} onSubmit={create} initial={{ from: roles[roles.length - 1]?.id ?? "viewer" }}
      fields={[{ name: "name", label: "Role name", required: true }, { name: "description", label: "Description", type: "textarea" }, { name: "from", label: "Start from", type: "select", options: roles.map(r => ({ value: r.id, label: r.name })) }]}/>}
    {form === "edit" && <RecordForm title="Edit role" submitLabel="Save" onClose={() => setForm(null)} onSubmit={rename} initial={{ name: role.name, description: role.description }} fields={[{ name: "name", label: "Role name", required: true }, { name: "description", label: "Description", type: "textarea" }]}/>}
  </Pane>;
}

/* --------------------------------------------------------------- services */

type Service = { id: string; name: string; description: string; setup: number; monthly: number; active: boolean };
const DEFAULT_SERVICES: Service[] = [
  { id: "s1", name: "Signature Plan", description: "Custom website up to 5 pages, mobile responsive, contact forms, basic SEO, hosting and 2 monthly content updates.", setup: 12500, monthly: 1800, active: true },
  { id: "s2", name: "Growth Plan", description: "Up to 10 pages, landing pages, online booking, blog or CMS, integrations, monthly SEO report and priority support.", setup: 25000, monthly: 3200, active: true },
  { id: "s3", name: "Premium Plan", description: "Fully bespoke design, advanced animation, e-commerce or client portal, unlimited updates and a dedicated account lead.", setup: 55000, monthly: 6500, active: true },
  { id: "s4", name: "Website Scoping Call", description: "A free conversation to match the right plan to the business.", setup: 0, monthly: 0, active: true },
];
const serviceFields = [
  { name: "name", label: "Service name", required: true, wide: true },
  { name: "description", label: "Description", type: "textarea" as const },
  { name: "setup", label: "Once-off setup fee (R)", type: "number" as const, min: 0 },
  { name: "monthly", label: "Monthly fee (R)", type: "number" as const, min: 0 },
  { name: "active", label: "Offer this service (shows when creating projects and opportunities)", type: "checkbox" as const },
];

export function ServicesOfferings() {
  const { confirm, toast } = useDialogs();
  const [services, setServices] = usePersisted<Service[]>("services", DEFAULT_SERVICES);
  const [form, setForm] = useState<{ service?: Service } | null>(null);
  const submit = (v: FormValues) => {
    const next = { name: String(v.name).trim(), description: String(v.description).trim(), setup: Number(v.setup), monthly: Number(v.monthly), active: Boolean(v.active) };
    if (form?.service) { setServices(list => list.map(s => s.id === form.service!.id ? { ...s, ...next } : s)); logAudit("Services & Offerings", `Updated service ${next.name}`); toast("Service saved"); }
    else { setServices(list => [...list, { id: `s${Date.now()}`, ...next }]); logAudit("Services & Offerings", `Added service ${next.name}`); toast("Service added"); }
    setForm(null);
  };
  const remove = async (s: Service) => { if (!await confirm({ title: `Delete ${s.name}?`, message: "Existing clients and projects keep their service label.", confirmLabel: "Delete", tone: "danger" })) return; setServices(list => list.filter(x => x.id !== s.id)); logAudit("Services & Offerings", `Deleted service ${s.name}`); toast("Service deleted"); };
  const flip = (s: Service, active: boolean) => { setServices(list => list.map(x => x.id === s.id ? { ...x, active } : x)); logAudit("Services & Offerings", `${active ? "Enabled" : "Disabled"} service ${s.name}`); };

  return <Pane title="Services & Offerings" subtitle="The packages and services you sell, with their prices." icon={Layers} action={<button type="button" className="button primary" onClick={() => setForm({})}><Plus size={16}/>Add service</button>}>
    <div className="sp-table-wrap"><table className="data-table">
      <thead><tr><th>Service</th><th>Setup</th><th>Monthly</th><th>Offered</th><th style={{ width: 48 }}/></tr></thead>
      <tbody>{services.map(s => <tr key={s.id} style={{ opacity: s.active ? 1 : .6 }}>
        <td style={{ maxWidth: 420, padding: "10px 12px" }}><b style={{ fontWeight: 500 }}>{s.name}</b><small style={{ display: "block", color: "var(--muted)", lineHeight: 1.4 }}>{s.description}</small></td>
        <td>{s.setup ? money(s.setup) : "Free"}</td><td>{s.monthly ? `${money(s.monthly)}/mo` : "—"}</td>
        <td><Switch checked={s.active} onChange={v => flip(s, v)} label={`Offer ${s.name}`}/></td>
        <td><RowMenu label={`Actions for ${s.name}`} items={[{ label: "Edit", icon: Pencil, onClick: () => setForm({ service: s }) }, { label: "Delete", icon: Trash2, tone: "danger", separatorBefore: true, onClick: () => void remove(s) }]}/></td>
      </tr>)}</tbody>
    </table>{services.length === 0 && <div className="empty" style={{ minHeight: 120 }}>No services yet.</div>}</div>
    {form && <RecordForm title={form.service ? "Edit service" : "Add service"} submitLabel={form.service ? "Save" : "Add service"} onClose={() => setForm(null)} onSubmit={submit}
      initial={form.service ? { ...form.service } : { active: true }} fields={serviceFields}/>}
  </Pane>;
}

/* --------------------------------------------------------------- pipeline */

type Stage = { id: string; name: string; probability: number; color: string };
const COLOURS: Record<string, string> = { Green: "#08bf68", Teal: "#14b8a6", Blue: "#3b8fdc", Amber: "#e0a02a", Orange: "#f97316", Red: "#d9534f", Purple: "#8b5cf6", Grey: "#8e9a9c" };
const DEFAULT_STAGES: Stage[] = [
  { id: "g1", name: "Lead", probability: 10, color: COLOURS.Grey },
  { id: "g2", name: "Qualified", probability: 30, color: COLOURS.Blue },
  { id: "g3", name: "Proposal", probability: 50, color: COLOURS.Amber },
  { id: "g4", name: "Negotiation", probability: 75, color: COLOURS.Orange },
  { id: "g5", name: "Won", probability: 100, color: COLOURS.Green },
];

export function PipelineStages() {
  const { confirm, toast } = useDialogs();
  const [stages, setStages] = usePersisted<Stage[]>("stages", DEFAULT_STAGES);
  const [form, setForm] = useState<{ stage?: Stage } | null>(null);
  const colourName = (hex: string) => Object.keys(COLOURS).find(k => COLOURS[k] === hex) ?? "Grey";
  const move = (index: number, by: -1 | 1) => { const next = [...stages]; const target = index + by; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setStages(next); logAudit("Pipeline & Stages", `Reordered stage ${stages[index].name}`); };
  const submit = (v: FormValues) => {
    const name = String(v.name).trim();
    if (stages.some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== form?.stage?.id)) { toast("A stage with that name already exists", "error"); return; }
    const next = { name, probability: Number(v.probability), color: COLOURS[String(v.colour)] ?? COLOURS.Grey };
    if (form?.stage) { setStages(list => list.map(s => s.id === form.stage!.id ? { ...s, ...next } : s)); logAudit("Pipeline & Stages", `Updated stage ${name}`); toast("Stage saved"); }
    else { setStages(list => [...list, { id: `g${Date.now()}`, ...next }]); logAudit("Pipeline & Stages", `Added stage ${name}`); toast("Stage added"); }
    setForm(null);
  };
  const remove = async (s: Stage) => {
    if (stages.length <= 2) { toast("A pipeline needs at least two stages", "error"); return; }
    if (!await confirm({ title: `Delete the ${s.name} stage?`, message: "Opportunities in this stage will need to be moved.", confirmLabel: "Delete stage", tone: "danger" })) return;
    setStages(list => list.filter(x => x.id !== s.id)); logAudit("Pipeline & Stages", `Deleted stage ${s.name}`); toast("Stage deleted");
  };

  return <Pane title="Pipeline & Stages" subtitle="The steps a deal moves through, and how likely each step is to close." icon={Tag} action={<button type="button" className="button primary" onClick={() => setForm({})}><Plus size={16}/>Add stage</button>}>
    <div className="sp-list">{stages.map((s, i) => <div className="sp-stage" key={s.id}>
      <i className="dot" style={{ background: s.color }}/><span className="grow"><b style={{ fontWeight: 500 }}>{s.name}</b><small>{s.probability}% chance to close</small></span>
      <button type="button" className="icon-button" aria-label={`Move ${s.name} up`} disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp size={16}/></button>
      <button type="button" className="icon-button" aria-label={`Move ${s.name} down`} disabled={i === stages.length - 1} onClick={() => move(i, 1)}><ChevronDown size={16}/></button>
      <button type="button" className="icon-button" aria-label={`Edit ${s.name}`} onClick={() => setForm({ stage: s })}><Pencil size={15}/></button>
      <button type="button" className="icon-button" aria-label={`Delete ${s.name}`} onClick={() => void remove(s)}><Trash2 size={15}/></button>
    </div>)}</div>
    <p className="sp-note">The win probability is used to weight the pipeline value. Demonstration: the pipeline board still shows the standard five stages.</p>
    {form && <RecordForm title={form.stage ? "Edit stage" : "Add stage"} submitLabel={form.stage ? "Save" : "Add stage"} onClose={() => setForm(null)} onSubmit={submit}
      initial={form.stage ? { name: form.stage.name, probability: form.stage.probability, colour: colourName(form.stage.color) } : { probability: 50, colour: "Blue" }}
      fields={[{ name: "name", label: "Stage name", required: true, wide: true }, { name: "probability", label: "Chance to close (%)", type: "number", min: 0, max: 100 }, { name: "colour", label: "Colour", type: "select", options: Object.keys(COLOURS) }]}/>}
  </Pane>;
}
