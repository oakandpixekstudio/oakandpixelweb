"use client";

import { Children, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------
   Shared popover positioning: rendered in a portal so panels with
   overflow hidden never clip it, flips above when there is no room.
   ------------------------------------------------------------------ */
type Placement = { top: number; left: number; width: number; maxHeight: number; above: boolean };

export function usePopover(open: boolean, trigger: React.RefObject<HTMLElement | null>, desiredHeight: number) {
  const [placement, setPlacement] = useState<Placement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = trigger.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const above = spaceBelow < Math.min(desiredHeight, 220) && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, Math.min(desiredHeight, above ? spaceAbove : spaceBelow));
      const left = Math.min(rect.left, Math.max(12, window.innerWidth - Math.max(rect.width, 280) - 12));
      setPlacement({ top: above ? rect.top - 8 : rect.bottom + 8, left, width: rect.width, maxHeight, above });
    };
    // Measuring the trigger is an external layout read; positioning must happen before paint.
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [open, trigger, desiredHeight]);
  return open ? placement : null;
}

export function useDismiss(open: boolean, close: () => void, refs: React.RefObject<HTMLElement | null>[]) {
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => { if (refs.every(ref => !ref.current?.contains(event.target as Node))) close(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close, refs]);
}

/* ------------------------------------------------------------------
   Select: drop-in replacement for a native <select> with <option>s.
   ------------------------------------------------------------------ */
type Option = { value: string; label: ReactNode };

function readOptions(children: ReactNode): Option[] {
  const options: Option[] = [];
  Children.toArray(children).forEach(child => {
    if (!isValidElement<{ value?: string; children?: ReactNode }>(child) || child.type !== "option") return;
    const label = child.props.children;
    const value = child.props.value ?? (typeof label === "string" ? label : String(Children.toArray(label).join("")));
    options.push({ value: String(value), label });
  });
  return options;
}

export function Select({ value, defaultValue, onChange, children, name, className = "", style, disabled, ...rest }: {
  value?: string; defaultValue?: string; name?: string; className?: string; style?: CSSProperties; disabled?: boolean;
  onChange?: (event: { target: { value: string } }) => void; children: ReactNode; "aria-label"?: string;
}) {
  const options = useMemo(() => readOptions(children), [children]);
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? "");
  const current = value ?? inner;
  const selected = options.find(o => o.value === current) ?? options[0];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const placement = usePopover(open, trigger, Math.min(options.length * 42 + 12, 320));
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, useMemo(() => [trigger, list], []));

  const choose = (option: Option) => {
    setInner(option.value);
    onChange?.({ target: { value: option.value } });
    setOpen(false);
    trigger.current?.focus();
  };
  const openList = () => { setActive(Math.max(0, options.findIndex(o => o.value === current))); setOpen(true); };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); openList(); return; }
    if (!open) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(i => Math.min(options.length - 1, i + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (event.key === "Home") { event.preventDefault(); setActive(0); }
    else if (event.key === "End") { event.preventDefault(); setActive(options.length - 1); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (options[active]) choose(options[active]); }
    else if (event.key === "Tab") setOpen(false);
  };
  useEffect(() => { if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [open, active]);

  return <div className={`select-root ${className}`} style={style}>
    <button type="button" ref={trigger} className="select-trigger" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} aria-label={rest["aria-label"]} onClick={() => open ? setOpen(false) : openList()} onKeyDown={onKeyDown}>
      <span className="select-value">{selected?.label}</span>
      <ChevronDown size={16} className={`select-chevron ${open ? "open" : ""}`}/>
    </button>
    {name && <input type="hidden" name={name} value={current}/>}
    {open && placement && createPortal(
      <ul ref={list} id={id} role="listbox" className="popover select-list" aria-label={rest["aria-label"]} style={{ position: "fixed", left: placement.left, minWidth: Math.max(placement.width, 190), maxHeight: placement.maxHeight, ...(placement.above ? { bottom: window.innerHeight - placement.top } : { top: placement.top }) }}>
        {options.map((option, index) => <li key={option.value} role="option" aria-selected={option.value === current} data-index={index} className={`select-option ${option.value === current ? "selected" : ""} ${index === active ? "active" : ""}`} onMouseEnter={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>
          <span>{option.label}</span>{option.value === current && <Check size={15}/>}
        </li>)}
      </ul>, document.body)}
  </div>;
}

/* ------------------------------------------------------------------
   Date helpers and calendar
   ------------------------------------------------------------------ */
const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const formatDay = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${monthShort[d.getMonth()]} ${d.getFullYear()}`;
const formatRangeDay = (d: Date) => `${monthShort[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
function parseDay(text: string): Date | null {
  const match = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(text.trim());
  if (!match) return null;
  const month = monthShort.findIndex(m => m.toLowerCase() === match[2].toLowerCase());
  return month < 0 ? null : new Date(Number(match[3]), month, Number(match[1]));
}

function Calendar({ month, onMonth, isSelected, inRange, onPick, footer }: {
  month: Date; onMonth: (d: Date) => void; isSelected: (d: Date) => boolean; inRange?: (d: Date) => boolean; onPick: (d: Date) => void; footer?: ReactNode;
}) {
  const today = startOfDay(new Date());
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - offset + i));
  return <div className="calendar">
    <div className="calendar-head">
      <button type="button" className="icon-button" aria-label="Previous month" onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16}/></button>
      <b>{monthLong[month.getMonth()]} {month.getFullYear()}</b>
      <button type="button" className="icon-button" aria-label="Next month" onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16}/></button>
    </div>
    <div className="calendar-grid" role="grid">
      {weekdays.map(w => <span key={w} className="calendar-dow">{w}</span>)}
      {cells.map(day => {
        const outside = day.getMonth() !== month.getMonth();
        const selected = isSelected(day);
        return <button type="button" key={day.toISOString()} role="gridcell" aria-selected={selected} aria-label={formatDay(day)} className={`calendar-day ${outside ? "outside" : ""} ${selected ? "selected" : ""} ${inRange?.(day) ? "in-range" : ""} ${sameDay(day, today) ? "today" : ""}`} onClick={() => onPick(day)}>{day.getDate()}</button>;
      })}
    </div>
    {footer && <div className="calendar-foot">{footer}</div>}
  </div>;
}

function useCalendarPopover() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const placement = usePopover(open, trigger, 360);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, useMemo(() => [trigger, pop], []));
  return { open, setOpen, trigger, pop, placement };
}

function PopoverShell({ pop, placement, children }: { pop: React.RefObject<HTMLDivElement | null>; placement: Placement; children: ReactNode }) {
  return createPortal(<div ref={pop} role="dialog" aria-label="Choose date" className="popover calendar-pop" style={{ position: "fixed", left: placement.left, ...(placement.above ? { bottom: window.innerHeight - placement.top } : { top: placement.top }) }}>{children}</div>, document.body);
}

/** Single date. Value and onChange use the app's "20 Nov 2026" format. */
export function DatePicker({ value, defaultValue = "", onChange, name, placeholder = "Select a date", "aria-label": ariaLabel }: {
  value?: string; defaultValue?: string; onChange?: (value: string) => void; name?: string; placeholder?: string; "aria-label"?: string;
}) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const selected = parseDay(current);
  const { open, setOpen, trigger, pop, placement } = useCalendarPopover();
  const [month, setMonth] = useState(() => selected ?? new Date());
  const pick = (day: Date) => { const text = formatDay(day); setInner(text); onChange?.(text); setOpen(false); trigger.current?.focus(); };
  return <div className="select-root date-root">
    <button type="button" ref={trigger} className="select-trigger" aria-haspopup="dialog" aria-expanded={open} aria-label={ariaLabel ?? "Choose date"} onClick={() => { if (!open) setMonth(selected ?? new Date()); setOpen(!open); }}>
      <CalendarDays size={16} className="date-icon"/><span className={`select-value ${selected ? "" : "placeholder"}`}>{selected ? current : placeholder}</span><ChevronDown size={16} className={`select-chevron ${open ? "open" : ""}`}/>
    </button>
    {name && <input type="hidden" name={name} value={current}/>}
    {open && placement && <PopoverShell pop={pop} placement={placement}>
      <Calendar month={month} onMonth={setMonth} isSelected={day => !!selected && sameDay(day, selected)} onPick={pick}
        footer={<><button type="button" className="text-btn" onClick={() => pick(startOfDay(new Date()))}>Today</button>{selected && <button type="button" className="text-btn muted" onClick={() => { setInner(""); onChange?.(""); setOpen(false); }}>Clear</button>}</>}/>
    </PopoverShell>}
  </div>;
}

/** Date range with two clicks (start, then end). */
export function DateRangePicker({ defaultStart, defaultEnd, onChange }: { defaultStart: Date; defaultEnd: Date; onChange?: (start: Date, end: Date) => void }) {
  const [range, setRange] = useState<{ start: Date; end: Date }>({ start: defaultStart, end: defaultEnd });
  const [pending, setPending] = useState<Date | null>(null);
  const { open, setOpen, trigger, pop, placement } = useCalendarPopover();
  const [month, setMonth] = useState(defaultStart);
  const pick = (day: Date) => {
    if (!pending) { setPending(day); return; }
    const [start, end] = day < pending ? [day, pending] : [pending, day];
    setRange({ start, end }); setPending(null); setOpen(false); onChange?.(start, end);
  };
  const start = pending ?? range.start; const end = pending ? pending : range.end;
  return <div className="select-root date-root range">
    <button type="button" ref={trigger} className="select-trigger" aria-haspopup="dialog" aria-expanded={open} aria-label="Choose date range" onClick={() => { if (!open) { setMonth(range.start); setPending(null); } setOpen(!open); }}>
      <CalendarDays size={16} className="date-icon"/><span className="select-value">{formatRangeDay(range.start)} – {formatRangeDay(range.end)}</span><ChevronDown size={16} className={`select-chevron ${open ? "open" : ""}`}/>
    </button>
    {open && placement && <PopoverShell pop={pop} placement={placement}>
      <Calendar month={month} onMonth={setMonth} isSelected={day => sameDay(day, start) || sameDay(day, end)} inRange={day => day > start && day < end} onPick={pick}
        footer={<span className="calendar-hint">{pending ? "Now choose the end date" : "Choose a start date"}</span>}/>
    </PopoverShell>}
  </div>;
}
