"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlignCenter, AlignLeft, AlignRight, Bold, Eraser, Highlighter, Indent, Italic, Link2, List, ListOrdered, Outdent, Redo2, Strikethrough, Underline, Undo2, Unlink } from "lucide-react";
import { Select, useDismiss, usePopover } from "@/_components/controls";
import { sanitizeHtml } from "@/_lib/sanitize-html";

const SWATCHES = ["#111516", "#4b5557", "#8a9496", "#ffffff", "#c0392b", "#e67e22", "#f1c40f", "#08bf68", "#006b43", "#2980b9", "#8e44ad", "#d81b60"];
const HIGHLIGHTS = ["#fff3a3", "#ffd9b3", "#ffc9c9", "#c9f2dc", "#cfe6ff", "#e6d4ff"];
const SIZES = [["Small", "2"], ["Normal", "3"], ["Large", "5"], ["Huge", "6"]] as const;
const FONTS = [["Sans serif", "Arial, Helvetica, sans-serif"], ["Serif", "Georgia, serif"], ["Monospace", "Courier New, monospace"]] as const;

export type EditorHandle = { insertHtml: (html: string) => void; focus: () => void };

function ToolButton({ label, onClick, active, children, disabled }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode; disabled?: boolean }) {
  return <button type="button" className={`rte-btn ${active ? "active" : ""}`} aria-label={label} title={label} aria-pressed={active} disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={onClick}>{children}</button>;
}

function ColorMenu({ label, icon, colors, onPick, resetLabel }: { label: string; icon: React.ReactNode; colors: string[]; onPick: (color: string | null) => void; resetLabel: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const placement = usePopover(open, trigger, 220);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, useMemo(() => [trigger, pop], []));
  return <>
    <button type="button" ref={trigger} className={`rte-btn ${open ? "active" : ""}`} aria-label={label} title={label} aria-haspopup="dialog" aria-expanded={open} onMouseDown={e => e.preventDefault()} onClick={() => setOpen(v => !v)}>{icon}</button>
    {open && placement && createPortal(<div ref={pop} role="dialog" aria-label={label} className="popover color-pop" style={{ position: "fixed", left: placement.left, ...(placement.above ? { bottom: window.innerHeight - placement.top } : { top: placement.top }) }} onMouseDown={e => e.preventDefault()}>
      <div className="swatch-grid">{colors.map(color => <button type="button" key={color} className="swatch" style={{ background: color }} aria-label={color} onClick={() => { onPick(color); setOpen(false); }}/>)}</div>
      <button type="button" className="text-btn" onClick={() => { onPick(null); setOpen(false); }}>{resetLabel}</button>
    </div>, document.body)}
  </>;
}

function LinkMenu({ onApply, active }: { onApply: (url: string) => void; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const placement = usePopover(open, trigger, 120);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, useMemo(() => [trigger, pop], []));
  const apply = () => { const value = url.trim(); if (!value) return; onApply(/^(https?:|mailto:)/i.test(value) ? value : `https://${value}`); setUrl(""); setOpen(false); };
  return <>
    <button type="button" ref={trigger} className={`rte-btn ${active || open ? "active" : ""}`} aria-label="Insert link" title="Insert link (Ctrl+K)" aria-haspopup="dialog" aria-expanded={open} onMouseDown={e => e.preventDefault()} onClick={() => setOpen(v => !v)}><Link2 size={17}/></button>
    {open && placement && createPortal(<div ref={pop} role="dialog" aria-label="Insert link" className="popover link-pop" style={{ position: "fixed", left: placement.left, ...(placement.above ? { bottom: window.innerHeight - placement.top } : { top: placement.top }) }}>
      <label>Link address<input className="input" autoFocus value={url} placeholder="https://example.com" onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}/></label>
      <button type="button" className="button primary" onClick={apply}>Apply</button>
    </div>, document.body)}
  </>;
}

export function RichTextEditor({ initialHtml, onChange, onReady, placeholder = "Write your message…", onSubmitShortcut }: {
  initialHtml: string; onChange: (html: string) => void; onReady?: (handle: EditorHandle) => void; placeholder?: string; onSubmitShortcut?: () => void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);
  const [state, setState] = useState({ bold: false, italic: false, underline: false, strike: false, ul: false, ol: false, link: false });

  const sync = useCallback(() => { if (surface.current) onChange(surface.current.innerHTML); }, [onChange]);
  const remember = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount && surface.current?.contains(selection.anchorNode)) {
      saved.current = selection.getRangeAt(0).cloneRange();
      const anchor = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement;
      setState({
        bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"), underline: document.queryCommandState("underline"),
        strike: document.queryCommandState("strikeThrough"), ul: document.queryCommandState("insertUnorderedList"), ol: document.queryCommandState("insertOrderedList"),
        link: !!anchor?.closest("a"),
      });
    }
  }, []);
  const restore = useCallback(() => {
    surface.current?.focus();
    const selection = window.getSelection();
    if (saved.current && selection) { selection.removeAllRanges(); selection.addRange(saved.current); }
  }, []);
  const exec = useCallback((command: string, value?: string) => {
    restore();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
    sync(); remember();
  }, [restore, sync, remember]);
  const insertHtml = useCallback((html: string) => { restore(); document.execCommand("insertHTML", false, sanitizeHtml(html)); sync(); remember(); }, [restore, sync, remember]);

  useEffect(() => {
    if (surface.current) { surface.current.innerHTML = sanitizeHtml(initialHtml); onChange(surface.current.innerHTML); }
    onReady?.({ insertHtml, focus: () => surface.current?.focus() });
    // Seed the editor once; the editor owns its content afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    document.addEventListener("selectionchange", remember);
    return () => document.removeEventListener("selectionchange", remember);
  }, [remember]);

  const onPaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    if (html) document.execCommand("insertHTML", false, sanitizeHtml(html)); else document.execCommand("insertText", false, text);
    sync();
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "enter") { event.preventDefault(); onSubmitShortcut?.(); }
    if (mod && event.key.toLowerCase() === "k") { event.preventDefault(); const url = window.getSelection()?.toString(); if (url && /^https?:\/\//.test(url)) exec("createLink", url); }
  };

  return <div className="rte">
    <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
      <ToolButton label="Undo" onClick={() => exec("undo")}><Undo2 size={17}/></ToolButton>
      <ToolButton label="Redo" onClick={() => exec("redo")}><Redo2 size={17}/></ToolButton>
      <span className="rte-sep"/>
      <Select className="rte-select" aria-label="Font" defaultValue={FONTS[0][1]} onChange={e => exec("fontName", e.target.value)}>{FONTS.map(([name, value]) => <option key={name} value={value}>{name}</option>)}</Select>
      <Select className="rte-select narrow" aria-label="Text size" defaultValue="3" onChange={e => exec("fontSize", e.target.value)}>{SIZES.map(([name, value]) => <option key={name} value={value}>{name}</option>)}</Select>
      <span className="rte-sep"/>
      <ToolButton label="Bold (Ctrl+B)" active={state.bold} onClick={() => exec("bold")}><Bold size={17}/></ToolButton>
      <ToolButton label="Italic (Ctrl+I)" active={state.italic} onClick={() => exec("italic")}><Italic size={17}/></ToolButton>
      <ToolButton label="Underline (Ctrl+U)" active={state.underline} onClick={() => exec("underline")}><Underline size={17}/></ToolButton>
      <ToolButton label="Strikethrough" active={state.strike} onClick={() => exec("strikeThrough")}><Strikethrough size={17}/></ToolButton>
      <ColorMenu label="Text colour" resetLabel="Default colour" colors={SWATCHES} onPick={color => exec("foreColor", color ?? "#111516")} icon={<span className="color-icon">A</span>}/>
      <ColorMenu label="Highlight colour" resetLabel="No highlight" colors={HIGHLIGHTS} onPick={color => exec("hiliteColor", color ?? "transparent")} icon={<Highlighter size={17}/>}/>
      <span className="rte-sep"/>
      <ToolButton label="Bulleted list" active={state.ul} onClick={() => exec("insertUnorderedList")}><List size={17}/></ToolButton>
      <ToolButton label="Numbered list" active={state.ol} onClick={() => exec("insertOrderedList")}><ListOrdered size={17}/></ToolButton>
      <ToolButton label="Decrease indent" onClick={() => exec("outdent")}><Outdent size={17}/></ToolButton>
      <ToolButton label="Increase indent" onClick={() => exec("indent")}><Indent size={17}/></ToolButton>
      <span className="rte-sep"/>
      <ToolButton label="Align left" onClick={() => exec("justifyLeft")}><AlignLeft size={17}/></ToolButton>
      <ToolButton label="Align centre" onClick={() => exec("justifyCenter")}><AlignCenter size={17}/></ToolButton>
      <ToolButton label="Align right" onClick={() => exec("justifyRight")}><AlignRight size={17}/></ToolButton>
      <span className="rte-sep"/>
      <LinkMenu active={state.link} onApply={url => exec("createLink", url)}/>
      <ToolButton label="Remove link" onClick={() => exec("unlink")}><Unlink size={17}/></ToolButton>
      <ToolButton label="Clear formatting" onClick={() => exec("removeFormat")}><Eraser size={17}/></ToolButton>
    </div>
    <div ref={surface} className="rte-surface" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Message body" data-placeholder={placeholder} onInput={sync} onBlur={sync} onPaste={onPaste} onKeyDown={onKeyDown}/>
  </div>;
}
