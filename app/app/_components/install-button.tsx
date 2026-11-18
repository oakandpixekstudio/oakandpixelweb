"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/**
 * "Install app" button. Browsers that support installing web apps (Chrome, Edge and other
 * Chromium browsers) offer the install prompt; the button only appears when it is available
 * and the app is not already installed.
 */
export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (!prompt) return null;
  const install = async () => {
    await prompt.prompt();
    await prompt.userChoice.catch(() => undefined);
    setPrompt(null); // the browser only allows one prompt per event
  };
  return <button type="button" className="view-site desktop-only install-app" onClick={() => void install()}><Download size={16}/><span>Install app</span></button>;
}
