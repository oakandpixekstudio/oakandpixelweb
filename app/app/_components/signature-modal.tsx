"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Trash2, X } from "lucide-react";
import { RichTextEditor } from "@/_components/rich-text";
import { useDemoData } from "@/_providers/demo-data-provider";
import { useDialogs } from "@/_components/dialogs";
import { sanitizeHtml } from "@/_lib/sanitize-html";
import type { AppSignature } from "@/_types";

/** The HTML appended to new messages: the typed signature followed by the banner image. */
export function buildSignatureHtml(signature: AppSignature): string {
  if (!signature.enabled) return "";
  const banner = signature.banner ? `<div><img src="${signature.banner}" alt="Email banner" style="max-width: 100%"></div>` : "";
  return `<div><br></div><div><br></div>${signature.html}${banner ? `<div><br></div>${banner}` : ""}`;
}

async function fileToBanner(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const el = new Image(); el.onload = () => resolve(el); el.onerror = () => reject(new Error("load")); el.src = url; });
    const scale = Math.min(1, 640 / image.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.88);
  } finally { URL.revokeObjectURL(url); }
}

export function SignatureModal({ onClose }: { onClose: () => void }) {
  const { signature, setSignature } = useDemoData();
  const { toast } = useDialogs();
  const [html, setHtml] = useState(signature.html);
  const [banner, setBanner] = useState<string | undefined>(signature.banner);
  const [enabled, setEnabled] = useState(signature.enabled);
  const [error, setError] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const [initialHtml] = useState(signature.html);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.querySelector(".popover, .dialog")) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.type)) { setError("Choose a PNG, JPG, GIF or WebP image."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("That image is larger than 8 MB."); return; }
    try { setBanner(await fileToBanner(file)); setError(""); } catch { setError("That image could not be read."); }
  };
  const save = () => { setSignature({ html: sanitizeHtml(html), banner, enabled }); toast("Signature saved"); onClose(); };
  const previewHtml = buildSignatureHtml({ html: sanitizeHtml(html), banner, enabled: true });

  return createPortal(<div className="modal-backdrop form-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal record-form" role="dialog" aria-modal="true" aria-label="Email signature">
      <div className="modal-header"><div><h2 className="section-title">Email signature</h2><small style={{ color: "var(--muted)" }}>Appears at the bottom of every new message you write.</small></div><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={16}/></button></div>
      <div className="record-body" style={{ display: "grid", gap: 18 }}>
        <label className="check-row"><input type="checkbox" className="check" checked={enabled} onChange={e => setEnabled(e.target.checked)}/>Add my signature to new messages</label>
        <div className="field"><label>Email banner</label>
          <div className="banner-drop" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void choose(e.dataTransfer.files[0]); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {banner ? <img src={banner} alt="Email banner preview"/> : <><ImagePlus size={26}/><span>Upload your banner or logo (PNG, JPG, GIF or WebP)</span></>}
            <input ref={picker} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={e => { void choose(e.target.files?.[0]); e.target.value = ""; }}/>
            <div className="banner-actions">
              <button type="button" className="button" onClick={() => picker.current?.click()}><ImagePlus size={15}/>{banner ? "Replace image" : "Upload image"}</button>
              {banner && <button type="button" className="button danger-ghost" onClick={() => setBanner(undefined)}><Trash2 size={15}/>Remove</button>}
            </div>
          </div>
          {error ? <small className="field-error" role="alert">{error}</small> : <small className="field-hint">Wide images work best. Large images are resized to 640 px.</small>}
        </div>
        <div className="field"><label>Signature text</label><RichTextEditor initialHtml={initialHtml} onChange={setHtml} placeholder="Name, role, phone number…"/></div>
        <div className="field"><label>Preview</label><div className="signature-preview rich" dangerouslySetInnerHTML={{ __html: previewHtml }}/></div>
      </div>
      <div className="modal-footer record-foot"><span style={{ flex: 1 }}/><button type="button" className="button" onClick={onClose}>Cancel</button><button type="button" className="button primary" onClick={save}>Save signature</button></div>
    </div>
  </div>, document.body);
}
