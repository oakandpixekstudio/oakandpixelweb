"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { closestCorners, DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, CheckCircle2, CircleDashed, FileText, Handshake, ExternalLink, Layers, MoreHorizontal, Pencil, Plus, Scale, Target, Trash2, TrendingUp, Trophy } from "lucide-react";
import { KpiCard, Money, PageHero, Pagination, Panel, SearchBox, StatusBadge, TableCheckbox, useRowLink, ViewToggle } from "@/_components/shared";
import { Select } from "@/_components/controls";
import { RecordForm, type FieldDef, type FormValues } from "@/_components/record-form";
import { RowMenu } from "@/_components/row-menu";
import { useDemoData } from "@/_providers/demo-data-provider";
import { useDialogs } from "@/_components/dialogs";
import type { Opportunity, OpportunityStage, Task, TaskStatus } from "@/_types";

const taskStatuses: TaskStatus[] = ["To Do", "In Progress", "In Review", "Completed"];
type TaskForm = { mode: "new" } | { mode: "edit"; task: Task } | null;
type OppForm = { mode: "new"; stage?: OpportunityStage } | { mode: "edit"; opportunity: Opportunity } | null;

function useTaskActions() {
  const { projects, upsertTask, deleteTask } = useDemoData();
  const { confirm, toast } = useDialogs();
  const fields: FieldDef[] = [
    { name: "title", label: "Task title", required: true, wide: true },
    { name: "projectId", label: "Project", type: "select", required: true, options: projects.map(p => ({ value: p.id, label: p.name })) },
    { name: "assignee", label: "Assignee (initials)", required: true, placeholder: "e.g. LM" },
    { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High"] },
    { name: "status", label: "Status", type: "select", options: taskStatuses },
    { name: "due", label: "Due date", type: "date", required: true },
    { name: "progress", label: "Progress (%)", type: "number", min: 0, max: 100 },
    { name: "description", label: "Description", type: "textarea" },
  ];
  const initialOf = (t?: Task): Partial<FormValues> => t ? { title: t.title, projectId: t.projectId, assignee: t.assignee, priority: t.priority, status: t.status, due: t.due, progress: t.progress, description: t.description } : { projectId: projects[0]?.id ?? "", priority: "Medium", status: "To Do" };
  const save = (values: FormValues, existing?: Task) => {
    const task: Task = { id: existing?.id ?? crypto.randomUUID(), title: String(values.title).trim(), projectId: String(values.projectId), assignee: String(values.assignee).toUpperCase(), priority: values.priority as Task["priority"], status: values.status as TaskStatus, due: String(values.due), progress: values.status === "Completed" ? 100 : Number(values.progress), description: String(values.description) };
    upsertTask(task); toast(existing ? "Task updated" : "Task created");
  };
  const remove = async (task: Task) => {
    const ok = await confirm({ title: `Delete “${task.title}”?`, message: "This task will be permanently removed. This can’t be undone.", confirmLabel: "Delete task", tone: "danger" });
    if (ok) { deleteTask(task.id); toast("Task deleted"); }
    return ok;
  };
  return { fields, initialOf, save, remove };
}
function TaskFormModal({ form, actions, onClose }: { form: Exclude<TaskForm, null>; actions: ReturnType<typeof useTaskActions>; onClose: () => void }) {
  const editing = form.mode === "edit" ? form.task : undefined;
  return <RecordForm title={editing ? "Edit task" : "Create task"} subtitle={editing?.title} fields={actions.fields} onClose={onClose} initial={actions.initialOf(editing)} submitLabel={editing ? "Save changes" : "Create task"}
    onSubmit={values => { actions.save(values, editing); onClose(); }} onDelete={editing ? async () => { if (await actions.remove(editing)) onClose(); } : undefined} deleteLabel="Delete task"/>;
}

function useOpportunityActions() {
  const { clients, upsertOpportunity, deleteOpportunity } = useDemoData();
  const { confirm, toast } = useDialogs();
  const fields: FieldDef[] = [
    { name: "name", label: "Opportunity name", required: true, wide: true },
    { name: "clientId", label: "Client", type: "select", required: true, options: clients.map(c => ({ value: c.id, label: c.name })) },
    { name: "service", label: "Service", required: true, placeholder: "e.g. Website & CMS" },
    { name: "stage", label: "Stage", type: "select", options: opportunityStages },
    { name: "value", label: "Value (R)", type: "number", min: 0 },
    { name: "owner", label: "Owner (initials)", required: true, placeholder: "e.g. KM" },
  ];
  const initialOf = (o?: Opportunity, stage?: OpportunityStage): Partial<FormValues> => o ? { name: o.name, clientId: o.clientId, service: o.service, stage: o.stage, value: o.value, owner: o.owner } : { clientId: clients[0]?.id ?? "", name: clients[0]?.name ?? "", stage: stage ?? "Lead" };
  const save = (values: FormValues, existing?: Opportunity) => {
    const opportunity: Opportunity = { id: existing?.id ?? crypto.randomUUID(), name: String(values.name).trim(), clientId: String(values.clientId), service: String(values.service), stage: values.stage as OpportunityStage, value: Number(values.value), owner: String(values.owner).toUpperCase() };
    upsertOpportunity(opportunity); toast(existing ? "Opportunity updated" : "Opportunity added");
  };
  const remove = async (opportunity: Opportunity) => {
    const ok = await confirm({ title: `Delete “${opportunity.name}”?`, message: "This opportunity will be permanently removed from the pipeline.", confirmLabel: "Delete opportunity", tone: "danger" });
    if (ok) { deleteOpportunity(opportunity.id); toast("Opportunity deleted"); }
    return ok;
  };
  return { fields, initialOf, save, remove };
}
function OpportunityFormModal({ form, actions, onClose }: { form: Exclude<OppForm, null>; actions: ReturnType<typeof useOpportunityActions>; onClose: () => void }) {
  const editing = form.mode === "edit" ? form.opportunity : undefined;
  return <RecordForm title={editing ? `Edit ${editing.name}` : "Add opportunity"} subtitle={editing ? undefined : "Track a new deal in the pipeline."} fields={actions.fields} onClose={onClose} initial={actions.initialOf(editing, form.mode === "new" ? form.stage : undefined)} submitLabel={editing ? "Save changes" : "Add opportunity"}
    onSubmit={values => { actions.save(values, editing); onClose(); }} onDelete={editing ? async () => { if (await actions.remove(editing)) onClose(); } : undefined} deleteLabel="Delete opportunity"/>;
}

const opportunityStages:OpportunityStage[]=["Lead","Qualified","Proposal","Negotiation","Won"];
const stageIcons={Lead:Plus,Qualified:CheckCircle2,Proposal:FileText,Negotiation:Scale,Won:Trophy} as const;
const funnelShades=["#0aa85c","#2fbf78","#5fd49a","#8ee2b8","#8e9a9c"];

export function PipelineView(){
  const router=useRouter();
  const actions=useOpportunityActions();
  const[form,setForm]=useState<OppForm>(null);
  const rowLink=useRowLink();
  const{opportunities,moveOpportunity}=useDemoData();
  const[q,setQ]=useState("");const[service,setService]=useState("All Services");const[owner,setOwner]=useState("All Owners");const[view,setView]=useState<"grid"|"list">("grid");
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:5}}));
  const pipeline=opportunities.filter(o=>o.stage!=="Won").reduce((s,o)=>s+o.value,0);
  const weighted=opportunities.reduce((s,o)=>s+o.value*({Lead:.15,Qualified:.35,Proposal:.6,Negotiation:.8,Won:1}[o.stage]),0);
  const services=Array.from(new Set(opportunities.map(o=>o.service)));const owners=Array.from(new Set(opportunities.map(o=>o.owner)));
  const visible=opportunities.filter(o=>(o.name+o.service).toLowerCase().includes(q.toLowerCase())&&(service==="All Services"||o.service===service)&&(owner==="All Owners"||o.owner===owner));
  const menuFor=(o:Opportunity)=><RowMenu label={`Actions for ${o.name}`} size={16} items={[{label:"Open client",icon:ExternalLink,onClick:()=>router.push(`/clients/${o.clientId}`)},{label:"Edit opportunity",icon:Pencil,onClick:()=>setForm({mode:"edit",opportunity:o})},{label:"Delete opportunity",icon:Trash2,tone:"danger",separatorBefore:true,onClick:()=>{void actions.remove(o)}}]}/>;
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
      <Select className="select" aria-label="Service" value={service} onChange={e=>setService(e.target.value)}><option>All Services</option>{services.map(s=><option key={s}>{s}</option>)}</Select>
      <Select className="select" aria-label="Owner" value={owner} onChange={e=>setOwner(e.target.value)}><option>All Owners</option>{owners.map(o=><option key={o}>{o}</option>)}</Select>
      <span style={{flex:1}}/><ViewToggle value={view} onChange={setView}/><button className="button primary" onClick={()=>setForm({mode:"new"})}><Plus size={17}/>Add Opportunity</button></div>
    {view==="grid"?<DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={end}><div className="pipeline-board">{opportunityStages.map(stage=><OpportunityColumn key={stage} stage={stage} rows={visible.filter(o=>o.stage===stage)} onAdd={()=>setForm({mode:"new",stage})} menu={menuFor}/>)}<PipelineInsights rows={opportunities}/></div></DndContext>
    :<section className="panel table-wrap"><table className="data-table"><thead><tr><th>Opportunity</th><th>Service</th><th>Stage</th><th>Owner</th><th>Value</th><th/></tr></thead><tbody>{visible.map(o=><tr key={o.id} className="clickable" {...rowLink(`/clients/${o.clientId}`)}><td><strong>{o.name}</strong></td><td>{o.service}</td><td><StatusBadge value={o.stage}/></td><td><span className="avatar sm">{o.owner}</span></td><td><Money value={o.value}/></td><td>{menuFor(o)}</td></tr>)}</tbody></table></section>}
    {form&&<OpportunityFormModal form={form} actions={actions} onClose={()=>setForm(null)}/>}
    <style jsx>{`.pipeline-board{display:grid;grid-template-columns:repeat(5,minmax(200px,1fr)) minmax(260px,1.15fr);gap:10px;overflow-x:auto;padding-bottom:14px}`}</style>
  </>;
}

function OpportunityColumn({stage,rows,onAdd,menu}:{stage:OpportunityStage;rows:Opportunity[];onAdd:()=>void;menu:(o:Opportunity)=>React.ReactNode}){
  const{setNodeRef,isOver}=useDroppable({id:stage});const Icon=stageIcons[stage];
  return <section className="opp-column" ref={setNodeRef} style={{background:isOver?"var(--green-soft)":"var(--panel)"}}>
    <header><span className="col-title"><Icon size={17} color={stage==="Won"?"var(--green)":undefined}/>{stage}</span><span className="col-meta"><b>{rows.length}</b><MoreHorizontal size={15}/></span></header>
    <small><Money value={rows.reduce((s,o)=>s+o.value,0)}/></small>
    <div>{rows.map(o=><OpportunityCard key={o.id} opportunity={o} menu={menu(o)}/>)}</div>
    <button onClick={onAdd}><Plus size={14}/> Add Opportunity</button>
    <style jsx>{`.opp-column{border:1px solid var(--border);min-height:440px;display:flex;flex-direction:column;transition:background .15s}.opp-column header{display:flex;justify-content:space-between;align-items:center;padding:12px 10px 4px;font:17px var(--font-display)}.col-title,.col-meta{display:inline-flex;align-items:center;gap:8px}.col-meta{color:var(--muted)}.opp-column header b{font:11px var(--font-body);color:var(--text);background:color-mix(in srgb,var(--muted) 24%,transparent);padding:4px 8px}.opp-column>small{padding:0 10px 10px;color:var(--muted)}.opp-column>div{padding:0 8px;flex:1}.opp-column>button{margin:0 8px 8px;height:38px;border:1px solid var(--border);background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;gap:6px}.opp-column>button:hover{border-color:var(--green)}`}</style>
  </section>;
}

function OpportunityCard({opportunity:o,menu}:{opportunity:Opportunity;menu:React.ReactNode}){
  const{attributes,listeners,setNodeRef,transform,isDragging}=useDraggable({id:o.id});
  return <article ref={setNodeRef} {...listeners} {...attributes} style={{transform:CSS.Translate.toString(transform),opacity:isDragging?.3:1}} className={`opp-card stage-${o.stage.toLowerCase()}`}>
    <div><b>{o.name}</b><span style={{display:"inline-flex",alignItems:"center",gap:4,marginRight:-6}}>{o.stage==="Won"&&<CheckCircle2 size={16} color="var(--green)"/>}{menu}</span></div><p>{o.service}</p>
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
  const router=useRouter();
  const actions=useTaskActions();
  const[form,setForm]=useState<TaskForm>(null);
  const rowLink=useRowLink();
  const{tasks,projects,updateTask}=useDemoData();
  const[q,setQ]=useState("");const[project,setProject]=useState("All Projects");const[assignee,setAssignee]=useState("All Assignees");const[priority,setPriority]=useState("All Priority");const[status,setStatus]=useState("All Status");
  const[selected,setSelected]=useState(tasks[0]?.id);const[view,setView]=useState<"list"|"grid">("list");
  const[page,setPage]=useState(1);const[checked,setChecked]=useState<string[]>([]);const[sort,setSort]=useState<1|-1|0>(0);const pageSize=8;
  const projectName=(id:string)=>projects.find(p=>p.id===id)?.name??"";
  const assignees=Array.from(new Set(tasks.map(t=>t.assignee)));
  const filtered=tasks.filter(t=>(t.title+projectName(t.projectId)).toLowerCase().includes(q.toLowerCase())&&(project==="All Projects"||projectName(t.projectId)===project)&&(assignee==="All Assignees"||t.assignee===assignee)&&(priority==="All Priority"||t.priority===priority)&&(status==="All Status"||t.status===status));
  const rows=sort===0?filtered:[...filtered].sort((a,b)=>a.title.localeCompare(b.title)*sort);
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));const current=Math.min(page,pages);const pageRows=rows.slice((current-1)*pageSize,current*pageSize);
  const task=tasks.find(t=>t.id===selected)??pageRows[0];
  const allChecked=pageRows.length>0&&pageRows.every(t=>checked.includes(t.id));
  const reset=<T,>(set:(v:T)=>void)=>(v:T)=>{set(v);setPage(1)};
  const menuFor=(t:Task)=><RowMenu label={`Actions for ${t.title}`} items={[{label:"Open task",icon:ExternalLink,onClick:()=>router.push(`/tasks/${t.id}`)},{label:"Edit task",icon:Pencil,onClick:()=>setForm({mode:"edit",task:t})},{label:"Delete task",icon:Trash2,tone:"danger",separatorBefore:true,onClick:()=>{void actions.remove(t)}}]}/>;
  return <>
    <PageHero eyebrow="Tasks" title="Tasks" subtitle="Manage, assign and track work across all projects in one place."/>
    <div className="grid kpi-grid">
      <KpiCard iconLeft label="Total Tasks" value={String(tasks.length)} icon={CheckCircle2} active/>
      <KpiCard iconLeft label="In Progress" value={String(tasks.filter(t=>t.status==="In Progress").length)} icon={CircleDashed}/>
      <KpiCard iconLeft label="Completed (This Month)" value={String(tasks.filter(t=>t.status==="Completed").length)} icon={CheckCircle2}/>
      <KpiCard iconLeft label="Due This Week" value="5" icon={CalendarDays}/>
    </div>
    <div className="toolbar"><SearchBox value={q} onChange={reset(setQ)} placeholder="Search tasks…"/>
      <Select className="select" aria-label="Project" value={project} onChange={e=>reset(setProject)(e.target.value)}><option>All Projects</option>{projects.map(p=><option key={p.id}>{p.name}</option>)}</Select>
      <Select className="select" aria-label="Assignee" value={assignee} onChange={e=>reset(setAssignee)(e.target.value)}><option>All Assignees</option>{assignees.map(a=><option key={a}>{a}</option>)}</Select>
      <Select className="select" aria-label="Priority" value={priority} onChange={e=>reset(setPriority)(e.target.value)}><option>All Priority</option><option>High</option><option>Medium</option><option>Low</option></Select>
      <Select className="select" aria-label="Status" value={status} onChange={e=>reset(setStatus)(e.target.value)}><option>All Status</option>{["To Do","In Progress","In Review","Completed"].map(s=><option key={s}>{s}</option>)}</Select>
      <ViewToggle value={view} onChange={setView}/><span style={{flex:1}}/><button className="button primary" onClick={()=>setForm({mode:"new"})}><Plus size={16}/>Add Task</button></div>
    <div className="split"><section className="panel">
      {view==="list"?<div className="table-wrap"><table className="data-table"><thead><tr>
        <th style={{width:44}}><TableCheckbox label="Select all tasks" checked={allChecked} onChange={on=>setChecked(on?Array.from(new Set([...checked,...pageRows.map(t=>t.id)])):checked.filter(id=>!pageRows.some(t=>t.id===id)))}/></th>
        <th><button type="button" className="th-sort" onClick={()=>setSort(s=>s===1?-1:1)}>Task {sort===1?<ArrowUp size={13}/>:<ArrowDown size={13}/>}</button></th><th>Project</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due Date</th><th/></tr></thead>
        <tbody>{pageRows.map(t=><tr key={t.id} className={`${t.id===task?.id?"selected":""} clickable`} onMouseEnter={()=>setSelected(t.id)} {...rowLink(`/tasks/${t.id}`)}>
          <td><TableCheckbox label={`Select ${t.title}`} checked={checked.includes(t.id)} onChange={on=>setChecked(on?[...checked,t.id]:checked.filter(id=>id!==t.id))}/></td>
          <td><strong>{t.title}</strong></td><td>{projectName(t.projectId)}</td><td><span className="avatar sm">{t.assignee}</span></td>
          <td><span className="priority"><i className={`dot ${t.priority.toLowerCase()}`}/>{t.priority}</span></td><td><StatusBadge value={t.status}/></td><td className="nowrap">{t.due}</td><td>{menuFor(t)}</td></tr>)}</tbody></table></div>
      :<div className="card-grid">{pageRows.map(t=><button type="button" key={t.id} className={`card-tile ${t.id===task?.id?"selected":""}`} onMouseEnter={()=>setSelected(t.id)} onClick={rowLink(`/tasks/${t.id}`).onClick}><strong>{t.title}</strong><span style={{color:"var(--muted)"}}>{projectName(t.projectId)}</span><span style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span className="priority"><i className={`dot ${t.priority.toLowerCase()}`}/>{t.priority}</span><StatusBadge value={t.status}/></span></button>)}</div>}
      {pageRows.length===0&&<div className="empty" style={{minHeight:160}}>No tasks match these filters.</div>}
      <Pagination page={current} pageSize={pageSize} total={rows.length} noun="tasks" onPage={setPage}/>
    </section>{task&&<TaskInspector task={task} menu={menuFor(task)} onUpdate={p=>updateTask(task.id,p)}/>}</div>
    {form&&<TaskFormModal form={form} actions={actions} onClose={()=>setForm(null)}/>}
  </>;
}

export function TaskDetailView({taskId}:{taskId:string}){
  const router=useRouter();
  const actions=useTaskActions();
  const[form,setForm]=useState<TaskForm>(null);
  const{tasks,projects,updateTask}=useDemoData();
  const task=tasks.find(t=>t.id===taskId);
  if(!task)return <><PageHero eyebrow="Tasks" title="Task not found" subtitle="This task may have been deleted."/><Link href="/tasks" className="button">Back to tasks</Link></>;
  const project=projects.find(p=>p.id===task.projectId);
  return <>
    <PageHero eyebrow="Tasks / Task" title={task.title} subtitle={project?.name??"Task"}/>
    <div className="toolbar"><Link href="/tasks" className="button"><ArrowLeft size={16}/>Tasks</Link><span style={{flex:1}}/>{project&&<Link href={`/projects/${project.id}`} className="button">Open project</Link>}<button className="button" onClick={()=>setForm({mode:"edit",task})}><Pencil size={16}/>Edit task</button><button className="button danger-ghost" onClick={async()=>{if(await actions.remove(task))router.push("/tasks")}}><Trash2 size={16}/>Delete</button></div>
    <div style={{maxWidth:640}}><TaskInspector task={task} onUpdate={p=>updateTask(task.id,p)}/></div>
    {form&&<TaskFormModal form={form} actions={actions} onClose={()=>setForm(null)}/>}
  </>;
}

function TaskInspector({task,onUpdate,menu}:{task:Task;onUpdate:(p:Partial<Task>)=>void;menu?:React.ReactNode}){
  const{projects}=useDemoData();const{toast}=useDialogs();const[tab,setTab]=useState("Details");
  return <Panel>
    <div className="detail-title"><span className="logo-tile"><CheckCircle2 size={20}/></span><div><h2>{task.title}</h2><small style={{color:"var(--muted)"}}>{projects.find(p=>p.id===task.projectId)?.name}</small></div><span style={{marginLeft:"auto"}}>{menu}</span></div>
    <div className="tabs" style={{margin:"14px -18px"}}>{["Details","Subtasks","Comments","Files","Activity"].map(x=><button className={`tab ${tab===x?"active":""}`} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>
    {tab==="Details"?<>
      <p style={{lineHeight:1.7,color:"var(--muted)"}}>{task.description}</p>
      <div className="info-grid">
        <label className="info-box"><span>Status</span><Select className="select" value={task.status} onChange={e=>onUpdate({status:e.target.value as TaskStatus})}>{["To Do","In Progress","In Review","Completed"].map(x=><option key={x}>{x}</option>)}</Select></label>
        <label className="info-box"><span>Priority</span><Select className="select" value={task.priority} onChange={e=>onUpdate({priority:e.target.value as Task["priority"]})}><option>Low</option><option>Medium</option><option>High</option></Select></label>
        <div className="info-box"><span>Assignee</span><b><span className="avatar sm" style={{marginRight:8}}>{task.assignee}</span>{task.assignee}</b></div>
        <div className="info-box"><span>Due Date</span><b>{task.due}</b></div>
      </div>
      <div style={{margin:"18px 0"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span>Progress</span><b>{task.progress}%</b></div><input type="range" min="0" max="100" value={task.progress} onChange={e=>onUpdate({progress:Number(e.target.value)})} style={{width:"100%",accentColor:"var(--green)"}}/></div>
      <button className="button outline" style={{width:"100%"}} onClick={()=>{onUpdate({status:"Completed",progress:100});toast("Task marked as complete")}}><CheckCircle2 size={16}/>Mark as Complete</button>
    </>:<div className="empty">{tab} are available as frontend demonstration states.</div>}
    <style jsx>{`.info-box>span{display:block;color:var(--muted);font-size:10px;margin-bottom:6px}.info-box :global(.select-root){width:100%}`}</style>
  </Panel>;
}


