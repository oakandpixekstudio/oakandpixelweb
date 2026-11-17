"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, FileText, FolderKanban, Mail, Users } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ClientLogo, KpiCard, Money, PageHero, Panel, StatusBadge } from "@/_components/shared";
import { useDemoData } from "@/_providers/demo-data-provider";

export function OverviewView() {
  const { clients, projects, opportunities, invoices, emails } = useDemoData();
  const activeProjects = projects.filter(p=>p.stage!=="Completed");
  const pipeline = opportunities.filter(o=>o.stage!=="Won").reduce((s,o)=>s+o.value,0);
  const outstanding = invoices.reduce((sum,i)=>sum + Math.max(0, invoiceTotal(i)-i.paid),0);
  const chart = [
    {name:"In Progress", value:projects.filter(p=>p.stage==="In Progress").length,color:"#06b966"},
    {name:"In Review", value:projects.filter(p=>p.stage==="In Review").length,color:"#72e49e"},
    {name:"To Do", value:projects.filter(p=>p.stage==="To Do"||p.stage==="Backlog").length,color:"#8e9a9c"},
    {name:"Completed", value:projects.filter(p=>p.stage==="Completed").length,color:"#dfe3e2"},
  ];
  return <>
    <PageHero eyebrow="Overview" title="Good afternoon." subtitle="Your clients, projects and communications — all in one place."/>
    <div className="grid kpi-grid">
      <KpiCard label="Clients" value={String(clients.length)} note="2 this month" icon={Users} active/>
      <KpiCard label="Active Projects" value={String(activeProjects.length)} note="2 in progress" icon={FolderKanban}/>
      <KpiCard label="Pipeline Value" value={`R${pipeline.toLocaleString("en-ZA")}`} icon={BriefcaseBusiness}/>
      <KpiCard label="Invoices (Outstanding)" value={`R${outstanding.toLocaleString("en-ZA")}`} icon={FileText}/>
    </div>
    <div className="grid overview-mid">
      <Panel title="Sales Pipeline" action={<span><Money value={opportunities.reduce((s,o)=>s+o.value,0)}/> total value</span>}>
        <div className="pipeline-list">{["Lead","Qualified","Proposal","Negotiation","Won"].map(stage=>{const rows=opportunities.filter(o=>o.stage===stage);return <div className={stage==="Won"?"highlight-row":""} key={stage}><span><i/>{stage} ({rows.length})</span><strong><Money value={rows.reduce((s,o)=>s+o.value,0)}/></strong></div>})}</div>
      </Panel>
      <Panel title="Project Overview" action={<span>{activeProjects.length} active projects</span>}>
        <div className="chart-legend"><div className="donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chart} dataKey="value" innerRadius={44} outerRadius={68} stroke="none">{chart.map(c=><Cell key={c.name} fill={c.color}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><b>{projects.length}<small>Projects</small></b></div><div>{chart.map(c=><p key={c.name}><i style={{background:c.color}}/>{c.name}<strong>{c.value}</strong></p>)}</div></div>
      </Panel>
      <Panel title="Quick Actions">
        <div className="quick-actions"><Link href="/clients" className="button"><Users size={16}/>Add Client<ArrowRight size={15}/></Link><Link href="/projects" className="button"><FolderKanban size={16}/>Create Project<ArrowRight size={15}/></Link><Link href="/emails" className="button primary"><Mail size={16}/>Send Email<ArrowRight size={15}/></Link><Link href="/invoices" className="button"><FileText size={16}/>Create Invoice<ArrowRight size={15}/></Link></div>
      </Panel>
    </div>
    <div className="grid overview-bottom">
      <Panel title="Recent Clients" action={<Link href="/clients" className="text-link">View all clients <ArrowRight size={14}/></Link>}>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Client</th><th>Service</th><th>Project</th><th>Status</th></tr></thead><tbody>{clients.slice(0,4).map(c=>{const p=projects.find(p=>p.clientId===c.id);return <tr key={c.id}><td><span className="rc-cell"><ClientLogo id={c.id} initials={c.initials}/><strong>{c.name}</strong></span></td><td>{c.service}</td><td>{p?.name ?? "—"}</td><td><StatusBadge value={p?.stage ?? c.status}/></td></tr>})}</tbody></table></div>
      </Panel>
      <Panel title="Recent Emails" action={<Link href="/emails" className="text-link">View inbox <ArrowRight size={14}/></Link>}>
        <div className="compact-list">{emails.slice(0,3).map(e=><Link href="/emails" key={e.id}><Mail size={17}/><span><strong>{clients.find(c=>c.id===e.clientId)?.name}</strong><small>{e.subject}</small></span><time>{e.time}</time></Link>)}</div>
      </Panel>
      <Panel title="Recent Activity">
        <div className="timeline"><p><i/><span><strong>Project updated</strong><small>Trellis Capital · 2 hours ago</small></span></p><p><i/><span><strong>Email drafted</strong><small>Rivermere Consulting · 3 hours ago</small></span></p><p><i className="muted"/><span><strong>New client added</strong><small>Lumen Infrastructure · 5 hours ago</small></span></p></div>
      </Panel>
    </div>
    <style jsx>{`
      .overview-mid{grid-template-columns:1.15fr 1.1fr .75fr;margin-bottom:14px}.overview-bottom{grid-template-columns:1.35fr .9fr .75fr}.pipeline-list>div{height:35px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 10px}.pipeline-list i,.chart-legend i{display:inline-block;width:8px;height:8px;background:var(--muted);margin-right:12px}.pipeline-list .highlight-row{background:var(--green-soft)}.pipeline-list .highlight-row i{background:var(--green)}.chart-legend{display:flex;align-items:center;justify-content:center;gap:20px;min-height:150px}.donut{width:150px;height:150px;position:relative}.donut>b{position:absolute;inset:0;display:grid;place-content:center;text-align:center;font:24px var(--font-display)}.donut small{display:block;font:11px var(--font-body)}.chart-legend p{display:flex;align-items:center;min-width:180px;margin:10px 0}.chart-legend p strong{margin-left:auto}.quick-actions{display:grid;gap:8px}.quick-actions .button{justify-content:flex-start}.quick-actions .button svg:last-child{margin-left:auto}.rc-cell{display:flex;align-items:center;gap:10px}.rc-cell :global(.logo-tile){width:30px;height:30px;border:0;background:transparent}.text-link{color:var(--green);display:flex;align-items:center;gap:7px;font-size:12px}.compact-list a{display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid var(--line)}.compact-list span{display:flex;flex-direction:column;min-width:0}.compact-list small{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.compact-list time{margin-left:auto;color:var(--muted);font-size:10px}.timeline p{display:flex;gap:12px;margin:0;padding:8px 0}.timeline p>i{width:8px;height:8px;background:var(--green);margin-top:4px}.timeline p>i.muted{background:var(--muted)}.timeline span{display:flex;flex-direction:column}.timeline small{color:var(--muted);margin-top:3px}@media(max-width:1200px){.overview-mid,.overview-bottom{grid-template-columns:1fr 1fr}.overview-mid>:last-child,.overview-bottom>:last-child{grid-column:1/-1}}@media(max-width:800px){.overview-mid,.overview-bottom{grid-template-columns:1fr}.overview-mid>:last-child,.overview-bottom>:last-child{grid-column:auto}}
    `}</style>
  </>;
}

function invoiceTotal(invoice: {taxRate:number;items:{quantity:number;unitPrice:number}[]}) { const subtotal=invoice.items.reduce((s,i)=>s+i.quantity*i.unitPrice,0); return subtotal*(1+invoice.taxRate/100); }
