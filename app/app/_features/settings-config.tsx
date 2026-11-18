"use client";

import { useState } from "react";
import { Bell, Blocks, CalendarDays, ClipboardList, CreditCard, Mail, MessageCircle, Pencil, PenLine, Plus, Receipt, SlidersHorizontal, Trash2, Workflow, X, Cloud, Database, Hash, Calculator, Globe } from "lucide-react";
import { Select } from "@/_components/controls";
import { useDialogs } from "@/_components/dialogs";
import { RecordForm } from "@/_components/record-form";
import type { FormValues } from "@/_components/record-form";
import { RowMenu } from "@/_components/row-menu";
import { SignatureModal } from "@/_components/signature-modal";
import { Pane, Row, SaveBar, Switch, formatWhen } from "@/_features/settings-ui";
import { logAudit, useDraft, usePersisted } from "@/_lib/settings-store";

/* --------------------------------------------------------------- projects */

const PROJECT_DEFAULTS = { prefix: "PRJ", defaultStage: "Backlog", priority: "Medium", dueDays: 30, approval: true, timeTracking: false, autoArchive: true, archiveDays: 60, portal: false, statuses: ["To Do", "In Progress", "In Review", "Completed"] as string[] };

export function ProjectSettings() {
  const { toast } = useDialogs();
  const { draft, set, save, discard, dirty } = useDraft("project", PROJECT_DEFAULTS);
  const [status, setStatus] = useState("");
  const addStatus = () => {
    const name = status.trim();
    if (!name) return;
    if (draft.statuses.some(s => s.toLowerCase() === name.toLowerCase())) { toast("That status already exists", "error"); return; }
    set({ statuses: [...draft.statuses, name] }); setStatus("");
  };
  const onSave = () => {
    if (!/^[A-Za-z0-9]{1,6}$/.test(draft.prefix)) { toast("The project prefix must be 1 to 6 letters or numbers", "error"); return; }
    if (!(draft.dueDays >= 1 && draft.dueDays <= 365)) { toast("Default due date must be between 1 and 365 days", "error"); return; }
    save(); logAudit("Project Settings", "Updated project settings"); toast("Project settings saved");
  };
  return <Pane title="Project Settings" subtitle="Defaults that apply whenever a new project or task is created." icon={ClipboardList}>
    <div className="sp-section"><h3>Defaults</h3>
      <div className="sp-grid">
        <div className="field"><label htmlFor="ps-prefix">Project ID prefix</label><input id="ps-prefix" className="input" value={draft.prefix} maxLength={6} onChange={e => set({ prefix: e.target.value.toUpperCase() })}/></div>
        <div className="field"><label htmlFor="ps-due">Default due date (days after start)</label><input id="ps-due" className="input" type="number" min={1} max={365} value={draft.dueDays} onChange={e => set({ dueDays: Number(e.target.value) })}/></div>
        <div className="field"><label>Starting stage</label><Select aria-label="Starting stage" value={draft.defaultStage} onChange={e => set({ defaultStage: e.target.value })}>{["Backlog", "To Do", "In Progress"].map(s => <option key={s}>{s}</option>)}</Select></div>
        <div className="field"><label>Default task priority</label><Select aria-label="Default task priority" value={draft.priority} onChange={e => set({ priority: e.target.value })}>{["Low", "Medium", "High"].map(s => <option key={s}>{s}</option>)}</Select></div>
      </div></div>
    <div className="sp-section"><h3>Task statuses</h3>
      <div className="sp-chips">{draft.statuses.map(s => <span className="sp-chip" key={s}>{s}<button type="button" aria-label={`Remove ${s}`} disabled={draft.statuses.length <= 2} onClick={() => set({ statuses: draft.statuses.filter(x => x !== s) })}><X size={13}/></button></span>)}</div>
      <div className="sp-tools" style={{ marginTop: 8 }}><input className="input" style={{ maxWidth: 260 }} aria-label="New status" placeholder="Add a status" value={status} onChange={e => setStatus(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addStatus(); } }}/><button type="button" className="button" onClick={addStatus}><Plus size={15}/>Add</button></div></div>
    <div className="sp-section"><h3>Behaviour</h3>
      <Row title="Require client approval before completing" hint="A project cannot move to Completed until the client has signed off."><Switch checked={draft.approval} onChange={v => set({ approval: v })} label="Require client approval"/></Row>
      <Row title="Track time on tasks" hint="Adds a time log to every task."><Switch checked={draft.timeTracking} onChange={v => set({ timeTracking: v })} label="Track time"/></Row>
      <Row title="Show progress to clients" hint="Lets clients see project progress in a client portal."><Switch checked={draft.portal} onChange={v => set({ portal: v })} label="Client portal"/></Row>
      <Row title="Archive completed projects" hint="Hide finished projects from the main list after a delay."><Switch checked={draft.autoArchive} onChange={v => set({ autoArchive: v })} label="Auto-archive"/>{draft.autoArchive && <><input className="input" type="number" min={1} max={365} style={{ width: 80 }} aria-label="Archive after days" value={draft.archiveDays} onChange={e => set({ archiveDays: Number(e.target.value) })}/><span style={{ color: "var(--muted)" }}>days</span></>}</Row>
    </div>
    <SaveBar dirty={dirty} onSave={onSave} onDiscard={discard}/>
  </Pane>;
}

/* -------------------------------------------------------------- invoicing */

const INVOICE_DEFAULTS = { prefix: "INV", next: 43, vat: 15, terms: "14", bank: "", holder: "Oak & Pixel Studio", account: "", branch: "", accountType: "Business cheque", reference: "Invoice number", lateFee: 0, remindBefore: true, remindAfter: true, eft: true, card: false, footer: "Payment is due within the stated terms. Thank you for your business." };

export function InvoicingPayments() {
  const { toast } = useDialogs();
  const { draft, set, save, discard, dirty } = useDraft("invoicing", INVOICE_DEFAULTS);
  const onSave = () => {
    if (!/^[A-Za-z0-9-]{1,8}$/.test(draft.prefix)) { toast("The invoice prefix must be 1 to 8 letters, numbers or dashes", "error"); return; }
    if (!Number.isInteger(draft.next) || draft.next < 1) { toast("The next invoice number must be a whole number from 1", "error"); return; }
    if (!(draft.vat >= 0 && draft.vat <= 100)) { toast("VAT must be between 0 and 100", "error"); return; }
    if (!(draft.lateFee >= 0 && draft.lateFee <= 100)) { toast("The late fee must be between 0 and 100", "error"); return; }
    if (draft.account && !/^\d{6,16}$/.test(draft.account.replace(/\s/g, ""))) { toast("Enter the account number using digits only (6 to 16)", "error"); return; }
    save(); logAudit("Invoicing & Payments", "Updated invoicing and payment settings"); toast("Invoicing settings saved");
  };
  return <Pane title="Invoicing & Payments" subtitle="How invoices are numbered, taxed and paid." icon={Receipt}>
    <div className="sp-section"><h3>Numbering and tax</h3>
      <div className="sp-grid">
        <div className="field"><label htmlFor="iv-prefix">Invoice prefix</label><input id="iv-prefix" className="input" value={draft.prefix} maxLength={8} onChange={e => set({ prefix: e.target.value.toUpperCase() })}/></div>
        <div className="field"><label htmlFor="iv-next">Next invoice number</label><input id="iv-next" className="input" type="number" min={1} value={draft.next} onChange={e => set({ next: Number(e.target.value) })}/><small className="field-hint">The next invoice will be {draft.prefix}-{String(Math.max(1, draft.next || 1)).padStart(4, "0")}</small></div>
        <div className="field"><label htmlFor="iv-vat">VAT rate (%)</label><input id="iv-vat" className="input" type="number" min={0} max={100} value={draft.vat} onChange={e => set({ vat: Number(e.target.value) })}/></div>
        <div className="field"><label>Currency</label><Select aria-label="Currency" value="ZAR" disabled><option value="ZAR">South African Rand (ZAR)</option></Select></div>
        <div className="field"><label>Payment terms</label><Select aria-label="Payment terms" value={draft.terms} onChange={e => set({ terms: e.target.value })}>{[["0", "Due on receipt"], ["7", "7 days"], ["14", "14 days"], ["30", "30 days"], ["60", "60 days"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
        <div className="field"><label htmlFor="iv-late">Late payment fee (% per month)</label><input id="iv-late" className="input" type="number" min={0} max={100} value={draft.lateFee} onChange={e => set({ lateFee: Number(e.target.value) })}/></div>
      </div></div>
    <div className="sp-section"><h3>Banking details shown on invoices</h3>
      <div className="sp-grid">
        <div className="field"><label htmlFor="iv-bank">Bank</label><input id="iv-bank" className="input" placeholder="e.g. FNB" value={draft.bank} onChange={e => set({ bank: e.target.value })}/></div>
        <div className="field"><label htmlFor="iv-holder">Account holder</label><input id="iv-holder" className="input" value={draft.holder} onChange={e => set({ holder: e.target.value })}/></div>
        <div className="field"><label htmlFor="iv-acc">Account number</label><input id="iv-acc" className="input" inputMode="numeric" autoComplete="off" value={draft.account} onChange={e => set({ account: e.target.value })}/></div>
        <div className="field"><label htmlFor="iv-branch">Branch code</label><input id="iv-branch" className="input" inputMode="numeric" value={draft.branch} onChange={e => set({ branch: e.target.value })}/></div>
        <div className="field"><label>Account type</label><Select aria-label="Account type" value={draft.accountType} onChange={e => set({ accountType: e.target.value })}>{["Business cheque", "Business savings", "Current", "Savings"].map(s => <option key={s}>{s}</option>)}</Select></div>
        <div className="field"><label>Payment reference</label><Select aria-label="Payment reference" value={draft.reference} onChange={e => set({ reference: e.target.value })}>{["Invoice number", "Client name", "Project name"].map(s => <option key={s}>{s}</option>)}</Select></div>
      </div><p className="sp-note">Banking details are stored in this browser only in this demonstration.</p></div>
    <div className="sp-section"><h3>Accepted payment methods</h3>
      <Row title="Bank transfer (EFT)" hint="Shows your banking details on every invoice."><Switch checked={draft.eft} onChange={v => set({ eft: v })} label="Bank transfer"/></Row>
      <Row title="Card payments online" hint="Adds a Pay now link. Needs a payment provider to be connected."><Switch checked={draft.card} onChange={v => set({ card: v })} label="Card payments"/></Row>
    </div>
    <div className="sp-section"><h3>Reminders</h3>
      <Row title="Remind clients before the due date" hint="A friendly reminder 3 days before an invoice is due."><Switch checked={draft.remindBefore} onChange={v => set({ remindBefore: v })} label="Remind before due"/></Row>
      <Row title="Chase overdue invoices" hint="Reminders 1, 7 and 14 days after the due date."><Switch checked={draft.remindAfter} onChange={v => set({ remindAfter: v })} label="Chase overdue"/></Row>
    </div>
    <div className="field"><label htmlFor="iv-foot" className="sp-label">Invoice footer</label><textarea id="iv-foot" className="textarea" rows={3} value={draft.footer} onChange={e => set({ footer: e.target.value })}/></div>
    <SaveBar dirty={dirty} onSave={onSave} onDiscard={discard}/>
  </Pane>;
}

/* ------------------------------------------------------------------ email */

const EMAIL_DEFAULTS = { fromName: "Oak & Pixel Studio", fromEmail: "info@oakandpixel.co.za", replyTo: "info@oakandpixel.co.za", bccSelf: false, undoSeconds: "10", trackOpens: false };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailSettings() {
  const { toast } = useDialogs();
  const { draft, set, save, discard, dirty } = useDraft("email", EMAIL_DEFAULTS);
  const [signature, setSignature] = useState(false);
  const onSave = () => {
    if (!draft.fromName.trim()) { toast("Enter the name that emails are sent from", "error"); return; }
    if (!EMAIL_RE.test(draft.fromEmail) || !EMAIL_RE.test(draft.replyTo)) { toast("Enter valid email addresses", "error"); return; }
    save(); logAudit("Email & Integrations", "Updated email settings"); toast("Email settings saved");
  };
  return <Pane title="Email" subtitle="How your emails are sent, and what they look like." icon={Mail}>
    <div className="sp-section"><h3>Sender</h3>
      <div className="sp-grid">
        <div className="field"><label htmlFor="em-name">From name</label><input id="em-name" className="input" value={draft.fromName} onChange={e => set({ fromName: e.target.value })}/></div>
        <div className="field"><label htmlFor="em-from">From address</label><input id="em-from" className="input" type="email" value={draft.fromEmail} onChange={e => set({ fromEmail: e.target.value })}/></div>
        <div className="field"><label htmlFor="em-reply">Reply-to address</label><input id="em-reply" className="input" type="email" value={draft.replyTo} onChange={e => set({ replyTo: e.target.value })}/></div>
        <div className="field"><label>Undo send window</label><Select aria-label="Undo send window" value={draft.undoSeconds} onChange={e => set({ undoSeconds: e.target.value })}>{[["0", "Off"], ["5", "5 seconds"], ["10", "10 seconds"], ["30", "30 seconds"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
      </div>
      <Row title="Copy me on every email I send" hint="Adds your address in Bcc."><Switch checked={draft.bccSelf} onChange={v => set({ bccSelf: v })} label="Bcc me"/></Row>
      <Row title="Track when emails are opened" hint="Off by default to respect recipients' privacy."><Switch checked={draft.trackOpens} onChange={v => set({ trackOpens: v })} label="Track opens"/></Row>
    </div>
    <div className="sp-section"><h3>Signature and banner</h3>
      <Row title="Email signature" hint="Added to the bottom of new messages. Includes your banner image."><button type="button" className="button" onClick={() => setSignature(true)}><PenLine size={15}/>Edit signature</button></Row></div>
    <div className="sp-section"><h3>Make sure your emails reach the inbox</h3>
      <p className="sp-note">Add these records at your domain provider so Gmail, Outlook and others trust email sent from your domain. Replace the example values with the ones your email provider gives you.</p>
      <div className="sp-cards" style={{ marginTop: 8 }}>
        {[["SPF", "TXT record on oakandpixel.co.za", "v=spf1 include:_spf.google.com ~all"], ["DKIM", "TXT record from your email provider", "google._domainkey → (key from your provider)"], ["DMARC", "TXT record on _dmarc.oakandpixel.co.za", "v=DMARC1; p=quarantine; rua=mailto:info@oakandpixel.co.za"]].map(([name, where, value]) => <div className="sp-card" key={name}><b>{name}</b><p>{where}</p><div className="sp-code">{value}</div></div>)}
      </div></div>
    <SaveBar dirty={dirty} onSave={onSave} onDiscard={discard}/>
    {signature && <SignatureModal onClose={() => setSignature(false)}/>}
  </Pane>;
}

/* ----------------------------------------------------------- integrations */

type Integration = { id: string; name: string; category: string; description: string; icon: typeof Mail };
const INTEGRATIONS: Integration[] = [
  { id: "google", name: "Google Workspace", category: "Email & calendar", description: "Send and receive email from your Gmail address and sync your calendar.", icon: Mail },
  { id: "microsoft", name: "Microsoft 365", category: "Email & calendar", description: "Connect Outlook mail and calendar.", icon: Cloud },
  { id: "gcal", name: "Google Calendar", category: "Email & calendar", description: "Show project due dates and meetings on your calendar.", icon: CalendarDays },
  { id: "whatsapp", name: "WhatsApp Business", category: "Messaging", description: "Message clients from their record and log the conversation.", icon: MessageCircle },
  { id: "slack", name: "Slack", category: "Messaging", description: "Post new leads and paid invoices to a channel.", icon: Hash },
  { id: "payfast", name: "PayFast", category: "Payments & accounting", description: "Let clients pay invoices by card or instant EFT.", icon: CreditCard },
  { id: "xero", name: "Xero", category: "Payments & accounting", description: "Sync invoices and payments with your accounting.", icon: Calculator },
  { id: "supabase", name: "Supabase", category: "Data & websites", description: "Read bookings and enquiries from the public website.", icon: Database },
  { id: "vercel", name: "Vercel", category: "Data & websites", description: "Show the deploy status of client websites.", icon: Globe },
  { id: "zapier", name: "Zapier", category: "Automation", description: "Connect to thousands of other apps.", icon: Workflow },
];

export function IntegrationsPanel() {
  const { confirm, toast } = useDialogs();
  const [connected, setConnected] = usePersisted<Record<string, string>>("integrations", {});
  const categories = Array.from(new Set(INTEGRATIONS.map(i => i.category)));
  const connect = async (i: Integration) => {
    if (!await confirm({ title: `Connect ${i.name}?`, message: "This is a demonstration: the connection is recorded in this browser only and no data is shared.", confirmLabel: "Connect" })) return;
    setConnected(map => ({ ...map, [i.id]: new Date().toISOString() })); logAudit("Integrations", `Connected ${i.name}`); toast(`${i.name} connected`);
  };
  const disconnect = async (i: Integration) => {
    if (!await confirm({ title: `Disconnect ${i.name}?`, message: "You can connect it again at any time.", confirmLabel: "Disconnect", tone: "danger" })) return;
    setConnected(map => { const { [i.id]: _gone, ...rest } = map; void _gone; return rest; }); logAudit("Integrations", `Disconnected ${i.name}`); toast(`${i.name} disconnected`);
  };
  return <Pane title="Integrations" subtitle="Connect the tools you already use." icon={Blocks}>
    <p className="sp-note">{Object.keys(connected).length} of {INTEGRATIONS.length} connected. Demonstration: connections are recorded in this browser only.</p>
    {categories.map(category => <div className="sp-section" key={category}><h3>{category}</h3>
      <div className="sp-cards">{INTEGRATIONS.filter(i => i.category === category).map(i => { const Icon = i.icon; const on = connected[i.id]; return <div className="sp-card" key={i.id}>
        <header><span className="sp-icon"><Icon size={19}/></span><div><b style={{ fontWeight: 500 }}>{i.name}</b>{on ? <span className="badge green">Connected</span> : <span className="badge">Not connected</span>}</div></header>
        <p>{i.description}</p>
        {on && <p>Connected {formatWhen(on)}</p>}
        {on ? <button type="button" className="button" onClick={() => void disconnect(i)}>Disconnect</button> : <button type="button" className="button primary" onClick={() => void connect(i)}>Connect</button>}
      </div>; })}</div></div>)}
  </Pane>;
}

/* ------------------------------------------------------------- automation */

type Rule = { id: string; name: string; trigger: string; action: string; delay: number; enabled: boolean };
const TRIGGERS = ["A new client is added", "A proposal is accepted", "An invoice becomes overdue", "A task is due tomorrow", "A project is completed", "A client emails you"];
const ACTIONS = ["Send a welcome email", "Create a project", "Send a payment reminder", "Notify the assignee", "Create a follow-up task", "Send a review request"];
const DEFAULT_RULES: Rule[] = [
  { id: "r1", name: "Welcome new clients", trigger: TRIGGERS[0], action: ACTIONS[0], delay: 0, enabled: true },
  { id: "r2", name: "Start the project when a proposal is accepted", trigger: TRIGGERS[1], action: ACTIONS[1], delay: 0, enabled: true },
  { id: "r3", name: "Chase overdue invoices", trigger: TRIGGERS[2], action: ACTIONS[2], delay: 7, enabled: true },
  { id: "r4", name: "Warn assignees about tomorrow's tasks", trigger: TRIGGERS[3], action: ACTIONS[3], delay: 0, enabled: false },
  { id: "r5", name: "Ask for a review after launch", trigger: TRIGGERS[4], action: ACTIONS[5], delay: 14, enabled: false },
];

export function AutomationPanel() {
  const { confirm, toast } = useDialogs();
  const [rules, setRules] = usePersisted<Rule[]>("automation", DEFAULT_RULES);
  const [form, setForm] = useState<{ rule?: Rule } | null>(null);
  const submit = (v: FormValues) => {
    const next = { name: String(v.name).trim(), trigger: String(v.trigger), action: String(v.action), delay: Number(v.delay), enabled: Boolean(v.enabled) };
    if (form?.rule) { setRules(list => list.map(r => r.id === form.rule!.id ? { ...r, ...next } : r)); logAudit("Automation", `Updated rule “${next.name}”`); toast("Rule saved"); }
    else { setRules(list => [...list, { id: `r${Date.now()}`, ...next }]); logAudit("Automation", `Created rule “${next.name}”`); toast("Rule created"); }
    setForm(null);
  };
  const flip = (r: Rule, enabled: boolean) => { setRules(list => list.map(x => x.id === r.id ? { ...x, enabled } : x)); logAudit("Automation", `${enabled ? "Turned on" : "Turned off"} rule “${r.name}”`); };
  const remove = async (r: Rule) => { if (!await confirm({ title: `Delete “${r.name}”?`, confirmLabel: "Delete rule", tone: "danger" })) return; setRules(list => list.filter(x => x.id !== r.id)); logAudit("Automation", `Deleted rule “${r.name}”`); toast("Rule deleted"); };
  return <Pane title="Automation" subtitle="Let the workspace do repetitive work for you." icon={SlidersHorizontal} action={<button type="button" className="button primary" onClick={() => setForm({})}><Plus size={16}/>New rule</button>}>
    <div className="sp-table-wrap"><table className="data-table">
      <thead><tr><th>Rule</th><th>When</th><th>Then</th><th>On</th><th style={{ width: 48 }}/></tr></thead>
      <tbody>{rules.map(r => <tr key={r.id} style={{ opacity: r.enabled ? 1 : .6 }}>
        <td><b style={{ fontWeight: 500 }}>{r.name}</b></td><td>{r.trigger}</td><td>{r.action}{r.delay > 0 ? ` after ${r.delay} day${r.delay === 1 ? "" : "s"}` : ""}</td>
        <td><Switch checked={r.enabled} onChange={v => flip(r, v)} label={`Turn ${r.name} on`}/></td>
        <td><RowMenu label={`Actions for ${r.name}`} items={[{ label: "Edit", icon: Pencil, onClick: () => setForm({ rule: r }) }, { label: "Delete", icon: Trash2, tone: "danger", separatorBefore: true, onClick: () => void remove(r) }]}/></td>
      </tr>)}</tbody>
    </table>{rules.length === 0 && <div className="empty" style={{ minHeight: 120 }}>No rules yet.</div>}</div>
    <p className="sp-note">Demonstration: rules are saved here but do not run yet, because there is no backend to act on them.</p>
    {form && <RecordForm title={form.rule ? "Edit rule" : "New rule"} submitLabel={form.rule ? "Save" : "Create rule"} onClose={() => setForm(null)} onSubmit={submit}
      initial={form.rule ? { ...form.rule } : { trigger: TRIGGERS[0], action: ACTIONS[0], enabled: true, delay: 0 }}
      fields={[{ name: "name", label: "Rule name", required: true, wide: true }, { name: "trigger", label: "When this happens", type: "select", options: TRIGGERS }, { name: "action", label: "Do this", type: "select", options: ACTIONS }, { name: "delay", label: "Wait (days)", type: "number", min: 0, max: 90, hint: "0 runs it straight away." }, { name: "enabled", label: "Turn this rule on", type: "checkbox" }]}/>}
  </Pane>;
}

/* ---------------------------------------------------------- notifications */

const EVENTS: [string, string][] = [
  ["client", "A new client is added"], ["proposal", "A proposal is accepted"], ["paid", "An invoice is paid"], ["overdue", "An invoice becomes overdue"],
  ["assigned", "A task is assigned to me"], ["due", "A task is due soon"], ["project", "A project changes status"], ["email", "A client emails me"],
];
const NOTIFY_DEFAULTS = {
  pauseAll: false, digest: "Off", quiet: false, from: "18:00", to: "07:00",
  prefs: Object.fromEntries(EVENTS.map(([id]) => [id, { app: true, email: ["paid", "overdue", "assigned"].includes(id) }])) as Record<string, { app: boolean; email: boolean }>,
};
const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

export function NotificationSettings() {
  const { toast } = useDialogs();
  const { draft, set, save, discard, dirty } = useDraft("notifications", NOTIFY_DEFAULTS);
  const prefs = { ...NOTIFY_DEFAULTS.prefs, ...draft.prefs };
  const setPref = (id: string, channel: "app" | "email", value: boolean) => set({ prefs: { ...prefs, [id]: { ...prefs[id], [channel]: value } } });
  const onSave = () => { save(); logAudit("Notifications", "Updated notification preferences"); toast("Notification preferences saved"); };
  return <Pane title="Notifications" subtitle="Choose what you hear about, and where." icon={Bell}>
    <Row title="Pause all notifications" hint="Nothing is sent to you until you turn this off."><Switch checked={draft.pauseAll} onChange={v => set({ pauseAll: v })} label="Pause all notifications"/></Row>
    <div className="sp-table-wrap" style={{ opacity: draft.pauseAll ? .5 : 1 }}><table className="sp-matrix sp-matrix-events"><thead><tr><th>Tell me when…</th><th>In the app</th><th>By email</th></tr></thead>
      <tbody>{EVENTS.map(([id, label]) => <tr key={id}><td>{label}</td>
        <td><Switch checked={prefs[id].app} disabled={draft.pauseAll} onChange={v => setPref(id, "app", v)} label={`${label}: in the app`}/></td>
        <td><Switch checked={prefs[id].email} disabled={draft.pauseAll} onChange={v => setPref(id, "email", v)} label={`${label}: by email`}/></td></tr>)}</tbody></table></div>
    <div className="sp-section"><h3>Summary and quiet hours</h3>
      <Row title="Email summary" hint="One email instead of many."><Select aria-label="Email summary" value={draft.digest} onChange={e => set({ digest: e.target.value })} style={{ minWidth: 150 }}>{["Off", "Daily", "Weekly"].map(s => <option key={s}>{s}</option>)}</Select></Row>
      <Row title="Quiet hours" hint="No emails or alerts during this time."><Switch checked={draft.quiet} onChange={v => set({ quiet: v })} label="Quiet hours"/>
        {draft.quiet && <><Select aria-label="Quiet hours start" value={draft.from} onChange={e => set({ from: e.target.value })} style={{ minWidth: 100 }}>{HOURS.map(h => <option key={h}>{h}</option>)}</Select><span style={{ color: "var(--muted)" }}>to</span><Select aria-label="Quiet hours end" value={draft.to} onChange={e => set({ to: e.target.value })} style={{ minWidth: 100 }}>{HOURS.map(h => <option key={h}>{h}</option>)}</Select></>}</Row>
    </div>
    <SaveBar dirty={dirty} onSave={onSave} onDiscard={discard}/>
  </Pane>;
}
