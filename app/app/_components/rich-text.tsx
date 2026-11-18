"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlignCenter, AlignLeft, AlignRight, Bold, Eraser, Highlighter, Indent, Italic, Link2, List, ListOrdered, Outdent, Redo2, Strikethrough, Underline, Undo2, Unlink } from "lucide-react";
import { Select, useDismiss, usePopover } from "@/_components/controls";
import { sanitizeHtml } from "@/_lib/sanitize-html";

const SWATCHES = ["#111516", "#4b5557", "#8a9496", "#ffffff", "#c0392b", "#e67e22", "#f1c40f", "#08bf68", "#006b43", "#2980b9", "#8e44ad", "#d81b60"];
const HIGHLIGHTS = ["#fff3a3", "#ffd9b3", "#ffc9c9", "#c9f2dc", "#cfe6ff", "#e6d4ff"];
/** Text sizes in pixels. The browser's own font-size command only knows seven coarse steps, so sizes are applied as real CSS. */
const SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48];
const nearestSize = (px: number) => SIZES.reduce((best, size) => (Math.abs(size - px) < Math.abs(best - px) ? size : best), SIZES[0]);
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
  const [state, setState] = useState({ bold: false, italic: false, underline: false, strike: false, ul: false, ol: false, link: false, size: 14, align: "left" });
  const pendingSize = useRef(14);

  /** The font-size command leaves <font size="7"> markers: turn them into spans with the chosen pixel size. */
  const normaliseSizes = useCallback(() => {
    const root = surface.current;
    if (!root) return;
    const markers = Array.from(root.querySelectorAll("font[size=\"7\"]"));
    if (markers.length === 0) return;
    const selection = window.getSelection();
    const hadRange = Boolean(selection && selection.rangeCount && !selection.isCollapsed && root.contains(selection.anchorNode));
    const spans = markers.map(font => {
      const span = document.createElement("span");
      span.style.fontSize = `${pendingSize.current}px`;
      while (font.firstChild) span.appendChild(font.firstChild);
      span.querySelectorAll<HTMLElement>("[style*='font-size']").forEach(inner => { inner.style.removeProperty("font-size"); if (!inner.getAttribute("style")) inner.removeAttribute("style"); });
      font.replaceWith(span);
      return span;
    });
    if (hadRange && selection) {
      const range = document.createRange();
      range.setStartBefore(spans[0]); range.setEndAfter(spans[spans.length - 1]);
      selection.removeAllRanges(); selection.addRange(range);
    }
  }, []);
  const sync = useCallback(() => { normaliseSizes(); if (surface.current) onChange(surface.current.innerHTML); }, [onChange, normaliseSizes]);
  const remember = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount && surface.current?.contains(selection.anchorNode)) {
      saved.current = selection.getRangeAt(0).cloneRange();
      const anchor = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement;
      // The element at the start of the selection (when the range starts between nodes, the node it points at).
      const range = selection.getRangeAt(0);
      const startNode = range.startContainer.nodeType === Node.ELEMENT_NODE && range.startContainer.childNodes[range.startOffset] ? range.startContainer.childNodes[range.startOffset] : range.startContainer;
      const startEl = startNode instanceof Element ? startNode : startNode.parentElement;
      const px = parseFloat(getComputedStyle(startEl ?? anchor ?? surface.current).fontSize);
      setState({
        size: Number.isFinite(px) ? nearestSize(px) : 14,
        align: document.queryCommandState("justifyCenter") ? "center" : document.queryCommandState("justifyRight") ? "right" : "left",
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
  const applySize = useCallback((px: number) => {
    pendingSize.current = px;
    restore();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("fontSize", false, "7");
    document.execCommand("styleWithCSS", false, "true");
    sync(); remember();
    setState(current => ({ ...current, size: px }));
  }, [restore, sync, remember]);
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
      <div className="rte-group" role="group" aria-label="History">
        <ToolButton label="Undo (Ctrl+Z)" onClick={() => exec("undo")}><Undo2 size={17}/></ToolButton>
        <ToolButton label="Redo (Ctrl+Y)" onClick={() => exec("redo")}><Redo2 size={17}/></ToolButton>
      </div>
      <div className="rte-group" role="group" aria-label="Font and size">
        <Select className="rte-select" aria-label="Font" defaultValue={FONTS[0][1]} onChange={e => exec("fontName", e.target.value)}>{FONTS.map(([name, value]) => <option key={name} value={value}>{name}</option>)}</Select>
        <Select className="rte-select narrow" aria-label="Text size in pixels" value={String(state.size)} onChange={e => applySize(Number(e.target.value))}>{SIZES.map(size => <option key={size} value={String(size)}>{size}</option>)}</Select>
      </div>
      <div className="rte-group" role="group" aria-label="Text formatting">
        <ToolButton label="Bold (Ctrl+B)" active={state.bold} onClick={() => exec("bold")}><Bold size={17}/></ToolButton>
        <ToolButton label="Italic (Ctrl+I)" active={state.italic} onClick={() => exec("italic")}><Italic size={17}/></ToolButton>
        <ToolButton label="Underline (Ctrl+U)" active={state.underline} onClick={() => exec("underline")}><Underline size={17}/></ToolButton>
        <ToolButton label="Strikethrough" active={state.strike} onClick={() => exec("strikeThrough")}><Strikethrough size={17}/></ToolButton>
        <ToolButton label="Clear formatting" onClick={() => exec("removeFormat")}><Eraser size={17}/></ToolButton>
      </div>
      <div className="rte-group" role="group" aria-label="Colours">
        <ColorMenu label="Text colour" resetLabel="Default colour" colors={SWATCHES} onPick={color => exec("foreColor", color ?? "#111516")} icon={<span className="color-icon">A</span>}/>
        <ColorMenu label="Highlight colour" resetLabel="No highlight" colors={HIGHLIGHTS} onPick={color => exec("hiliteColor", color ?? "transparent")} icon={<Highlighter size={17}/>}/>
      </div>
      <div className="rte-group" role="group" aria-label="Lists and indent">
        <ToolButton label="Bulleted list" active={state.ul} onClick={() => exec("insertUnorderedList")}><List size={17}/></ToolButton>
        <ToolButton label="Numbered list" active={state.ol} onClick={() => exec("insertOrderedList")}><ListOrdered size={17}/></ToolButton>
        <ToolButton label="Decrease indent" onClick={() => exec("outdent")}><Outdent size={17}/></ToolButton>
        <ToolButton label="Increase indent" onClick={() => exec("indent")}><Indent size={17}/></ToolButton>
      </div>
      <div className="rte-group" role="group" aria-label="Text alignment">
        <ToolButton label="Align left" active={state.align === "left"} onClick={() => exec("justifyLeft")}><AlignLeft size={17}/></ToolButton>
        <ToolButton label="Align centre" active={state.align === "center"} onClick={() => exec("justifyCenter")}><AlignCenter size={17}/></ToolButton>
        <ToolButton label="Align right" active={state.align === "right"} onClick={() => exec("justifyRight")}><AlignRight size={17}/></ToolButton>
      </div>
      <div className="rte-group" role="group" aria-label="Links">
        <LinkMenu active={state.link} onApply={url => exec("createLink", url)}/>
        <ToolButton label="Remove link" onClick={() => exec("unlink")}><Unlink size={17}/></ToolButton>
      </div>
    </div>
    <div ref={surface} className="rte-surface" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Message body" data-placeholder={placeholder} onInput={sync} onBlur={sync} onPaste={onPaste} onKeyDown={onKeyDown}/>
  </div>;
}
