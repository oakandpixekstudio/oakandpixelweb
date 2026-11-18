"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";

type ConfirmOptions = { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; tone?: "default" | "danger" };
type ToastTone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: ToastTone };
type DialogApi = { confirm: (options: ConfirmOptions) => Promise<boolean>; toast: (message: string, tone?: ToastTone) => void };

const DialogContext = createContext<DialogApi | null>(null);

export function useDialogs(): DialogApi {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useDialogs must be used inside DialogProvider");
  return context;
}

const toastIcons = { success: CircleCheck, error: CircleAlert, info: Info } as const;

const noop = () => () => {};

/** CRM-styled replacements for window.confirm and window.alert. */
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (value: boolean) => void } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  // false while the server renders and during hydration, then true: the portal below must not exist on the first client render.
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => setPending({ options, resolve })), []);
  const settle = useCallback((value: boolean) => { setPending(current => { current?.resolve(value); return null; }); }, []);
  const dismiss = useCallback((id: number) => setToasts(list => list.filter(t => t.id !== id)), []);
  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setToasts(list => [...list.slice(-3), { id, message, tone }]);
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  useEffect(() => {
    if (!pending) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); settle(false); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [pending, settle]);

  const api = useMemo<DialogApi>(() => ({ confirm, toast }), [confirm, toast]);
  const danger = pending?.options.tone === "danger";

  return <DialogContext.Provider value={api}>
    {children}
    {mounted && createPortal(<>
      {pending && <div className="modal-backdrop dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) settle(false); }}>
        <div className="modal dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby={pending.options.message ? "dialog-message" : undefined}>
          <span className={`dialog-icon ${danger ? "danger" : ""}`}>{danger ? <TriangleAlert size={22}/> : <Info size={22}/>}</span>
          <h2 id="dialog-title" className="section-title">{pending.options.title}</h2>
          {pending.options.message && <p id="dialog-message">{pending.options.message}</p>}
          <div className="dialog-actions">
            <button type="button" className="button" onClick={() => settle(false)}>{pending.options.cancelLabel ?? "Cancel"}</button>
            <button type="button" className={`button ${danger ? "danger" : "primary"}`} autoFocus onClick={() => settle(true)}>{pending.options.confirmLabel ?? "Confirm"}</button>
          </div>
        </div>
      </div>}
      <div className="toast-stack" aria-live="polite">
        {toasts.map(item => { const Icon = toastIcons[item.tone]; return <div key={item.id} className={`toast-card ${item.tone}`} role="status"><Icon size={19}/><span>{item.message}</span><button type="button" aria-label="Dismiss" onClick={() => dismiss(item.id)}><X size={15}/></button></div>; })}
      </div>
    </>, document.body)}
  </DialogContext.Provider>;
}
