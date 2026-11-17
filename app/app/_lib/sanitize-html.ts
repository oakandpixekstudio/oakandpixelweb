/**
 * Minimal allow-list HTML sanitiser for the email composer and reader.
 * Keeps basic formatting (bold, colours, lists, links) and drops everything
 * else, including scripts, event handlers and unsafe URLs.
 */
const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SPAN", "DIV", "P", "BR", "UL", "OL", "LI", "A", "BLOCKQUOTE", "FONT", "H1", "H2", "H3", "HR"]);
const DROP_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "NOSCRIPT", "TEMPLATE", "SVG", "MATH", "FORM", "INPUT", "BUTTON", "TEXTAREA", "SELECT", "IMG", "VIDEO", "AUDIO"]);
const ALLOWED_STYLES = new Set(["color", "background-color", "background", "font-size", "font-family", "font-weight", "font-style", "text-decoration", "text-decoration-line", "text-align", "margin-left", "padding-left"]);
const SAFE_VALUE = /^[\w\s#%.,()\-"'/]+$/;

function cleanStyle(style: string): string {
  return style.split(";").map(rule => {
    const index = rule.indexOf(":");
    if (index < 0) return "";
    const prop = rule.slice(0, index).trim().toLowerCase();
    const value = rule.slice(index + 1).trim();
    if (!ALLOWED_STYLES.has(prop) || !SAFE_VALUE.test(value) || /url\(|expression|javascript/i.test(value)) return "";
    return `${prop}: ${value}`;
  }).filter(Boolean).join("; ");
}

export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === "undefined") return html.replace(/<[^>]*>/g, "");
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const walk = (parent: Node) => {
    Array.from(parent.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) return;
      if (node.nodeType !== Node.ELEMENT_NODE) { node.parentNode?.removeChild(node); return; }
      const el = node as HTMLElement;
      if (DROP_TAGS.has(el.tagName)) { el.remove(); return; }
      if (!ALLOWED_TAGS.has(el.tagName)) {
        walk(el);
        while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
        el.remove();
        return;
      }
      Array.from(el.attributes).forEach(attr => {
        const name = attr.name.toLowerCase();
        if (name === "style") {
          const cleaned = cleanStyle(attr.value);
          if (cleaned) el.setAttribute("style", cleaned); else el.removeAttribute("style");
        } else if (name === "href" && el.tagName === "A") {
          if (!/^(https?:|mailto:)/i.test(attr.value.trim())) el.removeAttribute("href");
        } else if (el.tagName === "FONT" && (name === "color" || name === "size" || name === "face")) {
          // allowed legacy attributes produced by some browsers
        } else {
          el.removeAttribute(attr.name);
        }
      });
      if (el.tagName === "A") { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener noreferrer"); }
      walk(el);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

/** Plain-text version of a message body, with line breaks preserved. */
export function htmlToText(html: string): string {
  if (typeof DOMParser === "undefined") return html.replace(/<[^>]*>/g, " ");
  const withBreaks = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(div|p|li|h[1-3]|blockquote)>/gi, "\n");
  const doc = new DOMParser().parseFromString(`<body>${withBreaks}</body>`, "text/html");
  return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

export function textToHtml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.split("\n").map(line => (line ? `<div>${line}</div>` : "<div><br></div>")).join("");
}
