"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, FileText, Paperclip, PenLine, Save, Send, Trash2, X } from "lucide-react";
import { DatePicker, Select } from "@/_components/controls";
import { RichTextEditor, type EditorHandle } from "@/_components/rich-text";
import { useDemoData } from "@/_providers/demo-data-provider";
import { useDialogs } from "@/_components/dialogs";
import { buildSignatureHtml } from "@/_components/signature-modal";
import { htmlToText, textToHtml } from "@/_lib/sanitize-html";

export type ComposeInit = { mode: "new" | "reply" | "replyAll" | "forward"; to?: string[]; cc?: string[]; subject?: string; html?: string; draftId?: string };
export type ComposeResult = {
  kind: "send" | "draft" | "schedule"; to: string[]; cc: string[]; bcc: string[]; subject: string; html: string;
  attachments: { name: string; size: number }[]; scheduledFor?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BYTES = 25 * 1024 * 1024;
const TIMES = ["08:00", "09:00", "12:00", "15:00", "17:00"];
const titles = { new: "New message", reply: "Reply", replyAll: "Reply all", forward: "Forward" } as const;

const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

function RecipientField({ label, values, onChange, suggestions, autoFocus }: {
  label: string; values: string[]; onChange: (values: string[]) => void; suggestions: { name: string; email: string }[]; autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const commit = (text: string) => {
    const parts = text.split(/[\s,;]+/).map(p => p.trim()).filter(Boolean);
    if (!parts.length) return;
    onChange(Array.from(new Set([...values, ...parts])));
    setDraft("");
  };
  const matches = draft.length > 0 ? suggestions.filter(s => (s.name + s.email).toLowerCase().includes(draft.toLowerCase()) && !values.includes(s.email)).slice(0, 4) : [];
  return <div className="recipient-row">
    <span className="recipient-label">{label}</span>
    <div className="recipient-box">
      {values.map(value => <span key={value} className={`recipient-chip ${EMAIL.test(value) ? "" : "invalid"}`}>{value}<button type="button" aria-label={`Remove ${value}`} onClick={() => onChange(values.filter(v => v !== value))}><X size={12}/></button></span>)}
      <input className="recipient-input" autoFocus={autoFocus} value={draft} aria-label={`${label} recipients`} placeholder={values.length ? "" : "Add recipients"}
        onChange={e => { const text = e.target.value; if (/[,;\s]$/.test(text)) commit(text); else setDraft(text); }}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(draft); } else if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1)); }}
        onBlur={() => commit(draft)}
        onPaste={e => { const text = e.clipboardData.getData("text"); if (/[,;\s]/.test(text.trim())) { e.preventDefault(); commit(text); } }}/>
    </div>
    {matches.length > 0 && <ul className="suggest-list" role="listbox">{matches.map(m => <li key={m.email} role="option" aria-selected="false"><button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange([...values, m.email]); setDraft(""); }}><b>{m.name}</b><small>{m.email}</small></button></li>)}</ul>}
  </div>;
}

export function ComposeModal({ init, onClose, onSubmit }: { init: ComposeInit; onClose: () => void; onSubmit: (result: ComposeResult) => void }) {
  const { clients, templates, signature } = useDemoData();
  const { confirm } = useDialogs();
  const [to, setTo] = useState<string[]>(init.to ?? []);
  const [cc, setCc] = useState<string[]>(init.cc ?? []);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showCc, setShowCc] = useState((init.cc?.length ?? 0) > 0);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(init.subject ?? "");
  const [html, setHtml] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [sendDate, setSendDate] = useState("");
  const [sendTime, setSendTime] = useState("08:00");
  const [dragging, setDragging] = useState(false);
  const editor = useRef<EditorHandle | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [initialHtml] = useState(init.html ?? buildSignatureHtml(signature));
  const suggestions = clients.map(c => ({ name: c.contact || c.name, email: c.email }));
  const dirty = to.length > 0 || cc.length > 0 || bcc.length > 0 || subject.trim() !== "" || files.length > 0 || htmlToText(html) !== htmlToText(initialHtml);

  const requestClose = useCallback(async () => { if (!dirty || await confirm({ title: "Discard this message?", message: "Your changes will be lost.", confirmLabel: "Discard", tone: "danger" })) onClose(); }, [dirty, confirm, onClose]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.querySelector(".popover, .dialog")) requestClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [requestClose]);

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    const total = [...files, ...incoming].reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_BYTES) { setError("Attachments can total at most 25 MB."); return; }
    setError("");
    setFiles(current => [...current, ...incoming.filter(f => !current.some(c => c.name === f.name && c.size === f.size))]);
  };

  const submit = (kind: ComposeResult["kind"]) => {
    const all = [...to, ...cc, ...bcc];
    if (kind !== "draft") {
      if (to.length + cc.length + bcc.length === 0) { setError("Add at least one recipient."); return; }
      const bad = all.find(v => !EMAIL.test(v));
      if (bad) { setError(`“${bad}” is not a valid email address.`); return; }
    }
    if (kind === "schedule" && !sendDate) { setError("Choose a date to send this message."); return; }
    onSubmit({ kind, to, cc, bcc, subject: subject.trim() || "(no subject)", html, attachments: files.map(f => ({ name: f.name, size: f.size })), scheduledFor: kind === "schedule" ? `${sendDate} ${sendTime}` : undefined });
  };

  return createPortal(<div className="modal-backdrop compose-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) requestClose(); }}>
    <div className="modal compose" role="dialog" aria-modal="true" aria-label={titles[init.mode]} onDragOver={e => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }} onDragLeave={e => { if (e.currentTarget === e.target) setDragging(false); }} onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}>
      <div className="modal-header compose-head"><h2 className="section-title">{titles[init.mode]}</h2><button type="button" className="icon-button" aria-label="Close" onClick={requestClose}><X size={16}/></button></div>
      <div className="compose-body">
        <div className="recipient-wrap">
          <RecipientField label="To" values={to} onChange={setTo} suggestions={suggestions} autoFocus={init.mode !== "new" ? false : true}/>
          <div className="cc-toggles">{!showCc && <button type="button" className="text-btn" onClick={() => setShowCc(true)}>Cc</button>}{!showBcc && <button type="button" className="text-btn" onClick={() => setShowBcc(true)}>Bcc</button>}</div>
        </div>
        {showCc && <RecipientField label="Cc" values={cc} onChange={setCc} suggestions={suggestions}/>}
        {showBcc && <RecipientField label="Bcc" values={bcc} onChange={setBcc} suggestions={suggestions}/>}
        <div className="recipient-row"><span className="recipient-label">Subject</span><input className="subject-input" aria-label="Subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"/></div>
        <RichTextEditor initialHtml={initialHtml} onChange={setHtml} onReady={handle => { editor.current = handle; }} onSubmitShortcut={() => submit("send")}/>
        {files.length > 0 && <ul className="attach-list" aria-label="Attachments">{files.map(file => <li key={`${file.name}-${file.size}`} className="attach-chip"><FileText size={16}/><span><b>{file.name}</b><small>{formatSize(file.size)}</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(files.filter(f => f !== file))}><X size={14}/></button></li>)}</ul>}
        {scheduling && <div className="schedule-panel"><Clock size={17}/><span>Send on</span><div style={{ width: 190 }}><DatePicker aria-label="Send date" value={sendDate} onChange={setSendDate} placeholder="Choose a date"/></div><Select aria-label="Send time" value={sendTime} onChange={e => setSendTime(e.target.value)} style={{ minWidth: 110 }}>{TIMES.map(t => <option key={t}>{t}</option>)}</Select><button type="button" className="button primary" onClick={() => submit("schedule")}>Schedule send</button></div>}
        {error && <p className="compose-error" role="alert">{error}</p>}
        {dragging && <div className="drop-hint">Drop files to attach</div>}
      </div>
      <div className="modal-footer compose-foot">
        <button type="button" className="button primary" onClick={() => submit("send")}><Send size={16}/>Send</button>
        <button type="button" className={`button ${scheduling ? "outline" : ""}`} onClick={() => setScheduling(v => !v)}><Clock size={16}/>Send later</button>
        <input ref={picker} type="file" multiple hidden onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}/>
        <button type="button" className="icon-button" aria-label="Attach files" title="Attach files" onClick={() => picker.current?.click()}><Paperclip size={17}/></button>
        <button type="button" className="icon-button" aria-label="Insert signature" title="Insert signature" onClick={() => editor.current?.insertHtml(buildSignatureHtml({ ...signature, enabled: true }))}><PenLine size={17}/></button>
        <Select aria-label="Insert template" value="" style={{ minWidth: 170 }} onChange={e => { const template = templates.find(t => t.id === e.target.value); if (!template) return; editor.current?.insertHtml(textToHtml(template.body)); if (!subject.trim() && template.type === "Email") setSubject(template.name); }}>
          <option value="">Insert template</option>{templates.filter(t => t.type === "Email").map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <span style={{ flex: 1 }}/>
        <button type="button" className="button" onClick={() => submit("draft")}><Save size={16}/>Save draft</button>
        <button type="button" className="icon-button" aria-label="Discard" title="Discard" onClick={requestClose}><Trash2 size={17}/></button>
      </div>
      <p className="compose-note">Demonstration: messages are stored in this browser only. No email is delivered.</p>
    </div>
  </div>, document.body);
}
