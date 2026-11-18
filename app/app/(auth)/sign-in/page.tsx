"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, User } from "lucide-react";
import { motion } from "motion/react";
import { BrandMark } from "@/_components/shared";

export default function SignInPage() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: String(data.get("username") ?? ""), password: String(data.get("password") ?? ""), remember: data.get("remember") === "on" }),
      });
      if (response.ok) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the new session cookie is sent
        window.location.href = "/overview";
        return;
      }
      setError(response.status === 401 ? "Incorrect username or password." : "Sign-in is unavailable right now.");
    } catch {
      setError("Could not reach the server. Try again.");
    }
    setBusy(false);
  };

  return <main className="sign-in"><div className="image-tint"/><motion.section className="login" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.4}}><div className="login-brand"><BrandMark/><span>Oak &amp; Pixel</span></div><div className="eyebrow auth-eye">Team Workspace</div><h1>Sign in</h1><p>Access your clients, projects and communications.</p><form onSubmit={submit}><label><User size={19}/><input name="username" type="text" placeholder="Username" autoComplete="username" aria-label="Username" required autoFocus/></label><label><LockKeyhole size={19}/><input name="password" type={visible?"text":"password"} placeholder="Password" autoComplete="current-password" aria-label="Password" required/><button type="button" className="eye" onClick={()=>setVisible(v=>!v)} aria-label={visible?"Hide password":"Show password"}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-row"><label className="remember"><input name="remember" type="checkbox"/>Keep me signed in</label></div><button className="sign-button" disabled={busy}>{busy ? "Signing in..." : "Sign in"} <ArrowRight size={18}/></button></form></motion.section><i className="pixel p1"/><i className="pixel p2"/><i className="pixel p3"/><i className="pixel p4"/><style jsx global>{`.sign-in{min-height:100vh;display:grid;place-items:center;position:relative;overflow:hidden;background:url('/images/architecture/monolithic-concrete.png') center/cover}.image-tint{position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,9,13,.97),rgba(5,14,19,.8) 55%,rgba(6,14,19,.38))}.login{position:relative;z-index:1;width:min(480px,calc(100vw - 34px));text-align:center;color:#f4f5f1}.login .brand-mark{--mark-ink:#f1f2ee;--mark-dot:#0a0a09}.login-brand{display:flex;align-items:center;justify-content:center;gap:14px;font:27px var(--font-display);margin-bottom:70px}.auth-eye{justify-content:center}.auth-eye:before{content:"";width:62px;height:1px;background:var(--green)}.login h1{font:46px var(--font-display);margin:25px 0 12px}.login>p{color:#aeb8b9;margin-bottom:38px}.login form{display:grid;gap:14px}.login form>label{height:58px;border:1px solid rgba(230,235,233,.55);background:rgba(3,11,15,.42);display:flex;align-items:center;gap:15px;padding:0 18px}.login input{border:0;outline:0;background:transparent;flex:1;color:white}.eye,.forgot{border:0;background:transparent;color:#7ae6aa}.form-row{display:flex;align-items:center;justify-content:space-between;margin:5px 0 20px}.remember{display:flex;gap:10px;align-items:center}.remember input{appearance:none;width:20px;height:20px;border:1px solid #fff}.remember input:checked{background:var(--green);box-shadow:inset 0 0 0 4px #071218}.sign-button{height:57px;border:1px solid var(--green);background:linear-gradient(90deg,#00643d,var(--green));color:#fff;display:flex;align-items:center;justify-content:center;gap:14px;font-weight:600}.login form>small{color:#839092;margin-top:8px}.pixel{position:absolute;width:14px;height:14px;background:white;z-index:1}.pixel.p1{left:14%;top:23%}.pixel.p2{left:11%;bottom:18%;background:var(--green)}.pixel.p3{right:16%;top:24%;background:var(--green)}.pixel.p4{right:13%;top:20%;width:10px;height:10px}@media(max-width:600px){.login-brand{margin-bottom:45px}.login h1{font-size:38px}.pixel{display:none}}.form-error{color:#ff9a9a;margin:2px 0 0;font-size:14px;text-align:left}.sign-button:disabled{opacity:.7;cursor:wait}`}</style></main>;
}
