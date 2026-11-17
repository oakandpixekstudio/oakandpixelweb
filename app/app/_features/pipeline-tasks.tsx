"use client";

import { useState } from "react";
import { closestCorners, DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, CalendarDays, CheckCircle2, CircleDashed, FileText, Handshake, Layers, MoreHorizontal, Plus, Scale, Target, TrendingUp, Trophy, X } from "lucide-react";
import { KpiCard, Money, PageHero, Pagination, Panel, SearchBox, StatusBadge, TableCheckbox, ViewToggle } from "@/_components/shared";
import { useDemoData } from "@/_providers/demo-data-provider";
import type { Opportunity, OpportunityStage, Task, TaskStatus } from "@/_types";

const opportunityStages:OpportunityStage[]=["Lead","Qualified","Proposal","Negotiation","Won"];
const stageIcons={Lead:Plus,Qualified:CheckCircle2,Proposal:FileText,Negotiation:Scale,Won:Trophy} as const;
const funnelShades=["#0aa85c","#2fbf78","#5fd49a","#8ee2b8","#8e9a9c"];

export function PipelineView(){
  const{opportunities,moveOpportunity}=useDemoData();
  const[q,setQ]=useState("");const[service,setService]=useState("All Services");const[owner,setOwner]=useState("All Owners");const[view,setView]=useState<"grid"|"list">("grid");
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:5}}));
  const pipeline=opportunities.filter(o=>o.stage!=="Won").reduce((s,o)=>s+o.value,0);
  const weighted=opportunities.reduce((s,o)=>s+o.value*({Lead:.15,Qualified:.35,Proposal:.6,Negotiation:.8,Won:1}[o.stage]),0);
  const services=Array.from(new Set(opportunities.map(o=>o.service)));const owners=Array.from(new Set(opportunities.map(o=>o.owner)));
  const visible=opportunities.filter(o=>(o.name+o.service).toLowerCase().includes(q.toLowerCase())&&(service==="All Services"||o.service===service)&&(owner==="All Owners"||o.owner===owner));
  function end(e:DragEndEvent){const id=String(e.active.id);const over=String(e.over?.id??"");const stage=opportunityStages.includes(over as OpportunityStage)?over as OpportunityStage:opportunities.find(o=>o.id===over)?.stage;if(stage)moveOpportunity(id,stage)}
  return <>
    <PageHero eyebrow="Pipeline" title="Pipeline" subtitle="Track opportunities from lead to win and keep your revenue on target."/>
    <div className="grid kpi-grid">
      <KpiCard iconLeft label="Total Pipeline Value" value={`R${pipeline.toLocaleString("en-ZA")}`} icon={Layers} active/>
      <KpiCard iconLeft label="Weighted Value" value={`R${Math.round(weighted).toLocaleString("en-ZA")}`} icon={Target}/>
      <KpiCard iconLeft label="Open Opportunities" value={String(opportunities.filter(o=>o.stage!=="Won").length)} icon={Handshake}/>
      <KpiCard iconLeft label="Win Rate (YTD)" value={`${Math.round(opportunities.filter(o=>o.stage==="Won").length/Math.max(1,opportunities.length)*100)}%`} icon={Trophy}/>
    </div>
    <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search opportunities…"/>
      <select className="select" aria-label="Service" value={service} onChange={e=>setService(e.target.value)}><option>All Services</option>{services.map(s=><option key={s}>{s}</option>)}</select>
      <select className="select" aria-label="Owner" value={owner} onChange={e=>setOwner(e.target.value)}><option>All Owners</option>{owners.map(o=><option key={o}>{o}</option>)}</select>
      <span style={{flex:1}}/><ViewToggle value={view} onChange={setView}/><button className="button primary"><Plus size={17}/>Add Opportunity</button></div>
    {view==="grid"?<DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={end}><div className="pipeline-board">{opportunityStages.map(stage=><OpportunityColumn key={stage} stage={stage} rows={visible.filter(o=>o.stage===stage)}/>)}<PipelineInsights rows={opportunities}/></div></DndContext>
    :<section className="panel table-wrap"><table className="data-table"><thead><tr><th>Opportunity</th><th>Service</th><th>Stage</th><th>Owner</th><th>Value</th></tr></thead><tbody>{visible.map(o=><tr key={o.id}><td><strong>{o.name}</strong></td><td>{o.service}</td><td><StatusBadge value={o.stage}/></td><td><span className="avatar sm">{o.owner}</span></td><td><Money value={o.value}/></td></tr>)}</tbody></table></section>}
    <style jsx>{`.pipeline-board{display:grid;grid-template-columns:repeat(5,minmax(200px,1fr)) minmax(260px,1.15fr);gap:10px;overflow-x:auto;padding-bottom:14px}`}</style>
  </>;
}

function OpportunityColumn({stage,rows}:{stage:OpportunityStage;rows:Opportunity[]}){
  const{setNodeRef,isOver}=useDroppable({id:stage});const Icon=stageIcons[stage];
  return <section className="opp-column" ref={setNodeRef} style={{background:isOver?"var(--green-soft)":"var(--panel)"}}>
    <header><span className="col-title"><Icon size={17} color={stage==="Won"?"var(--green)":undefined}/>{stage}</span><span className="col-meta"><b>{rows.length}</b><MoreHorizontal size={15}/></span></header>
    <small><Money value={rows.reduce((s,o)=>s+o.value,0)}/></small>
    <div>{rows.map(o=><OpportunityCard key={o.id} opportunity={o}/>)}</div>
    <button><Plus size={14}/> Add Opportunity</button>
    <style jsx>{`.opp-column{border:1px solid var(--border);min-height:440px;display:flex;flex-direction:column;transition:background .15s}.opp-column header{display:flex;justify-content:space-between;align-items:center;padding:12px 10px 4px;font:17px var(--font-display)}.col-title,.col-meta{display:inline-flex;align-items:center;gap:8px}.col-meta{color:var(--muted)}.opp-column header b{font:11px var(--font-body);color:var(--text);background:color-mix(in srgb,var(--muted) 24%,transparent);padding:4px 8px}.opp-column>small{padding:0 10px 10px;color:var(--muted)}.opp-column>div{padding:0 8px;flex:1}.opp-column>button{margin:0 8px 8px;height:38px;border:1px solid var(--border);background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;gap:6px}.opp-column>button:hover{border-color:var(--green)}`}</style>
  </section>;
}

function OpportunityCard({opportunity:o}:{opportunity:Opportunity}){
  const{attributes,listeners,setNodeRef,transform,isDragging}=useDraggable({id:o.id});
  return <article ref={setNodeRef} {...listeners} {...attributes} style={{transform:CSS.Translate.toString(transform),opacity:isDragging?.3:1}} className={`opp-card stage-${o.stage.toLowerCase()}`}>
    <div><b>{o.name}</b>{o.stage==="Won"&&<CheckCircle2 size={16} color="var(--green)"/>}</div><p>{o.service}</p>
    <footer><Money value={o.value}/><span className="avatar sm">{o.owner}</span></footer>
    <style jsx>{`.opp-card{border:1px solid var(--line);border-left:4px solid var(--muted);padding:10px 10px 8px;margin-bottom:8px;background:var(--panel-strong);touch-action:none;cursor:grab}.opp-card.stage-qualified{border-left-color:#75a6ff}.opp-card.stage-proposal{border-left-color:#5b8def}.opp-card.stage-negotiation{border-left-color:#f3b33c}.opp-card.stage-won{border-left-color:var(--green)}.opp-card>div,.opp-card footer{display:flex;justify-content:space-between;align-items:center;gap:8px}.opp-card p{color:var(--muted);font-size:12px;margin:3px 0 12px}`}</style>
  </article>;
}

function PipelineInsights({rows}:{rows:Opportunity[]}){
  const total=Math.max(1,rows.length);const revenue=rows.reduce((s,o)=>s+o.value,0);const closing=rows.filter(o=>o.stage==="Negotiation"||o.stage==="Proposal").reduce((s,o)=>s+o.value,0);
  return <Panel title="Pipeline Insights">
    <div className="insight-top"><div className="funnel">{opportunityStages.map((s,i)=><i key={s} style={{width:`${100-i*14}%`,background:funnelShades[i]}}/>)}</div>
      <div className="legend">{opportunityStages.map((s,i)=>{const n=rows.filter(r=>r.stage===s).length;return <p key={s}><i style={{background:funnelShades[i]}}/>{s}<b>{n} ({Math.round(n/total*100)}%)</b></p>})}</div></div>
    <div className="metric"><Target size={16}/><span>Projected Revenue</span><b><Money value={revenue}/></b></div>
    <div className="metric"><CalendarDays size={16}/><span>Expected Close (Next 90 Days)</span><b><Money value={closing}/></b></div>
    <div className="metric"><TrendingUp size={16}/><span>Pipeline Growth (MoM)</span><b style={{color:"var(--green)"}}>+18%</b></div>
    <style jsx>{`.insight-top{display:flex;gap:14px;align-items:center;padding-bottom:12px}.funnel{width:78px;flex:0 0 78px;display:flex;flex-direction:column;align-items:center;gap:3px}.funnel i{height:18px;clip-path:polygon(0 0,100% 0,88% 100%,12% 100%)}.legend{flex:1;font-size:11px}.legend p{display:flex;align-items:center;margin:7px 0;gap:8px}.legend i{width:8px;height:8px;display:inline-block}.legend b{margin-left:auto;font-weight:400;color:var(--muted)}.metric{display:flex;align-items:center;gap:9px;padding:13px 0;border-top:1px solid var(--line);font-size:11px}.metric b{margin-left:auto;font-size:13px}`}</style>
  </Panel>;
}

export function TasksView(){
  const{tasks,projects,updateTask,addTask}=useDemoData();
  const[q,setQ]=useState("");const[project,setProject]=useState("All Projects");const[assignee,setAssignee]=useState("All Assignees");const[priority,setPriority]=useState("All Priority");const[status,setStatus]=useState("All Status");
  const[selected,setSelected]=useState(tasks[0]?.id);const[open,setOpen]=useState(false);const[view,setView]=useState<"list"|"grid">("list");
  const[page,setPage]=useState(1);const[checked,setChecked]=useState<string[]>([]);const[sort,setSort]=useState<1|-1|0>(0);const pageSize=8;
  const projectName=(id:string)=>projects.find(p=>p.id===id)?.name??"";
  const assignees=Array.from(new Set(tasks.map(t=>t.assignee)));
  const filtered=tasks.filter(t=>(t.title+projectName(t.projectId)).toLowerCase().includes(q.toLowerCase())&&(project==="All Projects"||projectName(t.projectId)===project)&&(assignee==="All Assignees"||t.assignee===assignee)&&(priority==="All Priority"||t.priority===priority)&&(status==="All Status"||t.status===status));
  const rows=sort===0?filtered:[...filtered].sort((a,b)=>a.title.localeCompare(b.title)*sort);
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));const current=Math.min(page,pages);const pageRows=rows.slice((current-1)*pageSize,current*pageSize);
  const task=tasks.find(t=>t.id===selected)??pageRows[0];
  const allChecked=pageRows.length>0&&pageRows.every(t=>checked.includes(t.id));
  const reset=<T,>(set:(v:T)=>void)=>(v:T)=>{set(v);setPage(1)};
  function create(form:FormData){const title=String(form.get("title"));addTask({id:crypto.randomUUID(),title,projectId:String(form.get("project")),assignee:String(form.get("assignee")),priority:String(form.get("priority")) as Task["priority"],status:"To Do",due:String(form.get("due")),progress:0,description:String(form.get("description"))});setOpen(false)}
  return <>
    <PageHero eyebrow="Tasks" title="Tasks" subtitle="Manage, assign and track work across all projects in one place."/>
    <div className="grid kpi-grid">
      <KpiCard iconLeft label="Total Tasks" value={String(tasks.length)} icon={CheckCircle2} active/>
      <KpiCard iconLeft label="In Progress" value={String(tasks.filter(t=>t.status==="In Progress").length)} icon={CircleDashed}/>
      <KpiCard iconLeft label="Completed (This Month)" value={String(tasks.filter(t=>t.status==="Completed").length)} icon={CheckCircle2}/>
      <KpiCard iconLeft label="Due This Week" value="5" icon={CalendarDays}/>
    </div>
    <div className="toolbar"><SearchBox value={q} onChange={reset(setQ)} placeholder="Search tasks…"/>
      <select className="select" aria-label="Project" value={project} onChange={e=>reset(setProject)(e.target.value)}><option>All Projects</option>{projects.map(p=><option key={p.id}>{p.name}</option>)}</select>
      <select className="select" aria-label="Assignee" value={assignee} onChange={e=>reset(setAssignee)(e.target.value)}><option>All Assignees</option>{assignees.map(a=><option key={a}>{a}</option>)}</select>
      <select className="select" aria-label="Priority" value={priority} onChange={e=>reset(setPriority)(e.target.value)}><option>All Priority</option><option>High</option><option>Medium</option><option>Low</option></select>
      <select className="select" aria-label="Status" value={status} onChange={e=>reset(setStatus)(e.target.value)}><option>All Status</option>{["To Do","In Progress","In Review","Completed"].map(s=><option key={s}>{s}</option>)}</select>
      <ViewToggle value={view} onChange={setView}/><span style={{flex:1}}/><button className="button primary" onClick={()=>setOpen(true)}><Plus size={16}/>Add Task</button></div>
    <div className="split"><section className="panel">
      {view==="list"?<div className="table-wrap"><table className="data-table"><thead><tr>
        <th style={{width:44}}><TableCheckbox label="Select all tasks" checked={allChecked} onChange={on=>setChecked(on?Array.from(new Set([...checked,...pageRows.map(t=>t.id)])):checked.filter(id=>!pageRows.some(t=>t.id===id)))}/></th>
        <th><button type="button" className="th-sort" onClick={()=>setSort(s=>s===1?-1:1)}>Task {sort===1?<ArrowUp size={13}/>:<ArrowDown size={13}/>}</button></th><th>Project</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due Date</th><th/></tr></thead>
        <tbody>{pageRows.map(t=><tr key={t.id} className={t.id===task?.id?"selected":""} onClick={()=>setSelected(t.id)}>
          <td><TableCheckbox label={`Select ${t.title}`} checked={checked.includes(t.id)} onChange={on=>setChecked(on?[...checked,t.id]:checked.filter(id=>id!==t.id))}/></td>
          <td><strong>{t.title}</strong></td><td>{projectName(t.projectId)}</td><td><span className="avatar sm">{t.assignee}</span></td>
          <td><span className="priority"><i className={`dot ${t.priority.toLowerCase()}`}/>{t.priority}</span></td><td><StatusBadge value={t.status}/></td><td className="nowrap">{t.due}</td><td><MoreHorizontal size={17}/></td></tr>)}</tbody></table></div>
      :<div className="card-grid">{pageRows.map(t=><button type="button" key={t.id} className={`card-tile ${t.id===task?.id?"selected":""}`} onClick={()=>setSelected(t.id)}><strong>{t.title}</strong><span style={{color:"var(--muted)"}}>{projectName(t.projectId)}</span><span style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span className="priority"><i className={`dot ${t.priority.toLowerCase()}`}/>{t.priority}</span><StatusBadge value={t.status}/></span></button>)}</div>}
      {pageRows.length===0&&<div className="empty" style={{minHeight:160}}>No tasks match these filters.</div>}
      <Pagination page={current} pageSize={pageSize} total={rows.length} noun="tasks" onPage={setPage}/>
    </section>{task&&<TaskInspector task={task} onUpdate={p=>updateTask(task.id,p)}/>}</div>
    {open&&<div className="modal-backdrop"><form className="modal" action={create}><div className="modal-header"><h2 className="section-title">Create task</h2><button type="button" className="icon-button" onClick={()=>setOpen(false)}><X size={16}/></button></div><div className="modal-body form-grid"><Field name="title" label="Task title"/><label className="field"><span>Project</span><select className="select" name="project">{projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><Field name="assignee" label="Assignee initials"/><label className="field"><span>Priority</span><select className="select" name="priority"><option>Low</option><option>Medium</option><option>High</option></select></label><Field name="due" label="Due date"/><Field name="description" label="Description"/></div><div className="modal-footer"><button type="button" className="button" onClick={()=>setOpen(false)}>Cancel</button><button className="button primary">Create demo task</button></div></form></div>}
  </>;
}

function TaskInspector({task,onUpdate}:{task:Task;onUpdate:(p:Partial<Task>)=>void}){
  const{projects}=useDemoData();const[tab,setTab]=useState("Details");
  return <Panel>
    <div className="detail-title"><span className="logo-tile"><CheckCircle2 size={20}/></span><div><h2>{task.title}</h2><small style={{color:"var(--muted)"}}>{projects.find(p=>p.id===task.projectId)?.name}</small></div><MoreHorizontal size={18} style={{marginLeft:"auto"}}/></div>
    <div className="tabs" style={{margin:"14px -18px"}}>{["Details","Subtasks","Comments","Files","Activity"].map(x=><button className={`tab ${tab===x?"active":""}`} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>
    {tab==="Details"?<>
      <p style={{lineHeight:1.7,color:"var(--muted)"}}>{task.description}</p>
      <div className="info-grid">
        <label className="info-box"><span>Status</span><select className="select" value={task.status} onChange={e=>onUpdate({status:e.target.value as TaskStatus})}>{["To Do","In Progress","In Review","Completed"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="info-box"><span>Priority</span><select className="select" value={task.priority} onChange={e=>onUpdate({priority:e.target.value as Task["priority"]})}><option>Low</option><option>Medium</option><option>High</option></select></label>
        <div className="info-box"><span>Assignee</span><b><span className="avatar sm" style={{marginRight:8}}>{task.assignee}</span>{task.assignee}</b></div>
        <div className="info-box"><span>Due Date</span><b>{task.due}</b></div>
      </div>
      <div style={{margin:"18px 0"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span>Progress</span><b>{task.progress}%</b></div><input type="range" min="0" max="100" value={task.progress} onChange={e=>onUpdate({progress:Number(e.target.value)})} style={{width:"100%",accentColor:"var(--green)"}}/></div>
      <button className="button outline" style={{width:"100%"}} onClick={()=>onUpdate({status:"Completed",progress:100})}><CheckCircle2 size={16}/>Mark as Complete</button>
    </>:<div className="empty">{tab} are available as frontend demonstration states.</div>}
    <style jsx>{`.info-box>span{display:block;color:var(--muted);font-size:10px;margin-bottom:6px}.info-box :global(.select){width:100%}`}</style>
  </Panel>;
}

function Field({name,label}:{name:string;label:string}){return <label className="field"><span>{label}</span><input name={name} className="input" required/><style jsx>{`span{display:block;color:var(--muted);font-size:11px;margin-bottom:7px}`}</style></label>}

