"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X } from "lucide-react";
import { DatePicker, Select } from "@/_components/controls";
import type { InvoiceItem } from "@/_types";

export type FieldOption = string | { value: string; label: string };
export type FieldDef = {
  name: string; label: string; type?: "text" | "email" | "tel" | "number" | "textarea" | "select" | "date" | "checkbox" | "items";
  options?: FieldOption[]; required?: boolean; wide?: boolean; placeholder?: string; min?: number; max?: number; hint?: string;
};
export type FormValue = string | number | boolean | InvoiceItem[];
export type FormValues = Record<string, FormValue>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const optionOf = (option: FieldOption) => typeof option === "string" ? { value: option, label: option } : option;

function defaultFor(field: FieldDef): FormValue {
  if (field.type === "checkbox") return false;
  if (field.type === "number") return 0;
  if (field.type === "items") return [{ description: "", quantity: 1, unitPrice: 0 }];
  if (field.type === "select") return optionOf(field.options?.[0] ?? "").value;
  return "";
}

function ItemsEditor({ items, onChange }: { items: InvoiceItem[]; onChange: (items: InvoiceItem[]) => void }) {
  const update = (index: number, patch: Partial<InvoiceItem>) => onChange(items.map((item, i) => i === index ? { ...item, ...patch } : item));
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return <div className="items-editor">
    <div className="items-head"><span>Description</span><span>Qty</span><span>Unit price (R)</span><span/></div>
    {items.map((item, index) => <div className="items-row" key={index}>
      <input className="input" aria-label={`Item ${index + 1} description`} value={item.description} placeholder="Service or product" onChange={e => update(index, { description: e.target.value })}/>
      <input className="input" type="number" min={0} aria-label={`Item ${index + 1} quantity`} value={item.quantity} onChange={e => update(index, { quantity: Number(e.target.value) })}/>
      <input className="input" type="number" min={0} aria-label={`Item ${index + 1} unit price`} value={item.unitPrice} onChange={e => update(index, { unitPrice: Number(e.target.value) })}/>
      <button type="button" className="icon-button" aria-label={`Remove item ${index + 1}`} disabled={items.length === 1} onClick={() => onChange(items.filter((_, i) => i !== index))}><Trash2 size={15}/></button>
    </div>)}
    <div className="items-foot"><button type="button" className="button" onClick={() => onChange([...items, { description: "", quantity: 1, unitPrice: 0 }])}><Plus size={15}/>Add line</button><span>Subtotal <b>R{subtotal.toLocaleString("en-ZA")}</b></span></div>
  </div>;
}

/** Generic create / edit dialog driven by a field list. */
export function RecordForm({ title, subtitle, fields, initial, submitLabel = "Save", onSubmit, onClose, onDelete, deleteLabel = "Delete" }: {
  title: string; subtitle?: string; fields: FieldDef[]; initial?: Partial<FormValues>; submitLabel?: string;
  onSubmit: (values: FormValues) => void; onClose: () => void; onDelete?: () => void; deleteLabel?: string;
}) {
  const [values, setValues] = useState<FormValues>(() => ({ ...Object.fromEntries(fields.map(f => [f.name, defaultFor(f)])), ...initial }) as FormValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (name: string, value: FormValue) => { setValues(current => ({ ...current, [name]: value })); setErrors(current => { const { [name]: _removed, ...rest } = current; void _removed; return rest; }); };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.querySelector(".popover, .dialog")) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    fields.forEach(field => {
      const value = values[field.name];
      if (field.type === "items") { const items = value as InvoiceItem[]; if (!items.some(i => i.description.trim())) found[field.name] = "Add at least one line with a description."; return; }
      if (typeof value === "string") {
        if (field.required && !value.trim()) found[field.name] = `${field.label} is required.`;
        else if (field.type === "email" && value && !EMAIL.test(value.trim())) found[field.name] = "Enter a valid email address.";
      }
      if (field.type === "number" && typeof value === "number") {
        if (Number.isNaN(value)) found[field.name] = "Enter a number.";
        else if (field.min !== undefined && value < field.min) found[field.name] = `Must be at least ${field.min}.`;
        else if (field.max !== undefined && value > field.max) found[field.name] = `Must be at most ${field.max}.`;
      }
    });
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(values);
  };

  return createPortal(<div className="modal-backdrop form-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <form className="modal record-form" role="dialog" aria-modal="true" aria-label={title} onSubmit={submit} noValidate>
      <div className="modal-header"><div><h2 className="section-title">{title}</h2>{subtitle && <small style={{ color: "var(--muted)" }}>{subtitle}</small>}</div><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={16}/></button></div>
      <div className="record-body form-grid">
        {fields.map(field => {
          const value = values[field.name];
          const wide = field.wide || field.type === "textarea" || field.type === "items";
          const id = `f-${field.name}`;
          return <div key={field.name} className={`field ${wide ? "wide" : ""}`}>
            {field.type !== "checkbox" && <label htmlFor={id}>{field.label}{field.required && <span aria-hidden="true"> *</span>}</label>}
            {field.type === "textarea" ? <textarea id={id} className="textarea" rows={4} value={String(value)} placeholder={field.placeholder} onChange={e => set(field.name, e.target.value)}/>
              : field.type === "select" ? <Select aria-label={field.label} value={String(value)} onChange={e => set(field.name, e.target.value)}>{(field.options ?? []).map(o => { const opt = optionOf(o); return <option key={opt.value} value={opt.value}>{opt.label}</option>; })}</Select>
              : field.type === "date" ? <DatePicker aria-label={field.label} value={String(value)} onChange={v => set(field.name, v)} placeholder={field.placeholder ?? "Select a date"}/>
              : field.type === "checkbox" ? <label className="check-row"><input type="checkbox" className="check" checked={Boolean(value)} onChange={e => set(field.name, e.target.checked)}/>{field.label}</label>
              : field.type === "items" ? <ItemsEditor items={value as InvoiceItem[]} onChange={items => set(field.name, items)}/>
              : <input id={id} className="input" type={field.type === "number" ? "number" : field.type ?? "text"} min={field.min} max={field.max} value={String(value)} placeholder={field.placeholder} onChange={e => set(field.name, field.type === "number" ? Number(e.target.value) : e.target.value)}/>}
            {field.hint && !errors[field.name] && <small className="field-hint">{field.hint}</small>}
            {errors[field.name] && <small className="field-error" role="alert">{errors[field.name]}</small>}
          </div>;
        })}
      </div>
      <div className="modal-footer record-foot">
        {onDelete && <button type="button" className="button danger-ghost" onClick={onDelete}><Trash2 size={15}/>{deleteLabel}</button>}
        <span style={{ flex: 1 }}/>
        <button type="button" className="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="button primary">{submitLabel}</button>
      </div>
    </form>
  </div>, document.body);
}
