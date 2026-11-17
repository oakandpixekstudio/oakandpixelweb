"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { useDismiss, usePopover } from "@/_components/controls";

export type MenuItem = { label: string; icon?: LucideIcon; onClick: () => void; tone?: "danger"; separatorBefore?: boolean };

/** Three-dot actions menu used on table rows, cards and detail panels. */
export function RowMenu({ items, label = "Actions", size = 17, buttonClass = "row-menu-btn" }: { items: MenuItem[]; label?: string; size?: number; buttonClass?: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const placement = usePopover(open, trigger, items.length * 42 + 16);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, useMemo(() => [trigger, pop], []));
  return <>
    <button type="button" ref={trigger} className={buttonClass} aria-label={label} aria-haspopup="menu" aria-expanded={open}
      onClick={event => { event.stopPropagation(); setOpen(v => !v); }} onKeyDown={event => event.stopPropagation()}><MoreHorizontal size={size}/></button>
    {open && placement && createPortal(<div ref={pop} role="menu" className="popover row-menu" style={{ position: "fixed", left: Math.max(12, placement.left + placement.width - 200), minWidth: 200, ...(placement.above ? { bottom: window.innerHeight - placement.top } : { top: placement.top }) }} onClick={event => event.stopPropagation()}>
      {items.map(item => <div key={item.label}>
        {item.separatorBefore && <div className="menu-sep"/>}
        <button type="button" role="menuitem" className={`menu-item ${item.tone === "danger" ? "danger" : ""}`} onClick={() => { setOpen(false); item.onClick(); }}>{item.icon && <item.icon size={16}/>}{item.label}</button>
      </div>)}
    </div>, document.body)}
  </>;
}
