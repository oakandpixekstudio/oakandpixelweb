"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { closestCorners, DndContext, DragEndEvent, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AppWindow, ArrowDown, ArrowUp, CalendarDays, CheckCircle2, CheckSquare, FolderKanban, Layers, ExternalLink, Mail, MoreHorizontal, Pencil, Play, Plus, RotateCcw, Search, Square, Trash2, Users } from "lucide-react";
import { KpiCard, PageHero, Pagination, Panel, Progress, SearchBox, StatusBadge, TableCheckbox, useRowLink, ViewToggle } from "@/_components/shared";
import { Select } from "@/_components/controls";
import { RecordForm, type FieldDef, type FormValues } from "@/_components/record-form";
import { RowMenu } from "@/_components/row-menu";
import { useDialogs } from "@/_components/dialogs";
import { useDemoData } from "@/_providers/demo-data-provider";
import type { Project, ProjectStage } from "@/_types";

const stages: ProjectStage[]=["Backlog","To Do","In Progress","In Review","Completed"];
type ProjectForm={mode:"new";stage?:ProjectStage}|{mode:"edit";project:Project}|null;
function useProjectActions(){
  const{clients,tasks,upsertProject,deleteProject}=useDemoData();
  const{confirm,toast}=useDialogs();
  const fields:FieldDef[]=[
    {name:"name",label:"Project name",required:true,wide:true},
    {name:"clientId",label:"Client",type:"select",required:true,options:clients.map(c=>({value:c.id,label:c.name}))},
    {name:"service",label:"Service",required:true,placeholder:"e.g. Website & CMS"},
    {name:"stage",label:"Stage",type:"select",options:stages},
    {name:"progress",label:"Progress (%)",type:"number",min:0,max:100},
    {name:"manager",label:"Project manager",required:true},
    {name:"start",label:"Start date",type:"date"},
    {name:"due",label:"Due date",type:"date",required:true},
    {name:"description",label:"Description",type:"textarea"},
  ];
  const initialOf=(p?:Project,stage?:ProjectStage):Partial<FormValues>=>p?{name:p.name,clientId:p.clientId,service:p.service,stage:p.stage,progress:p.progress,manager:p.manager,start:p.start??"",due:p.due,description:p.description}:{clientId:clients[0]?.id??"",stage:stage??"Backlog"};
  const save=(values:FormValues,existing?:Project)=>{
    const project:Project={id:existing?.id??crypto.randomUUID(),name:String(values.name).trim(),clientId:String(values.clientId),service:String(values.service),stage:values.stage as ProjectStage,progress:Number(values.progress),due:String(values.due),start:String(values.start)||undefined,manager:String(values.manager),description:String(values.description)};
    upsertProject(project);toast(existing?`${project.name} updated`:`${project.name} created`);
  };
  const remove=async(project:Project)=>{
    const n=tasks.filter(t=>t.projectId===project.id).length;
    const ok=await confirm({title:`Delete ${project.name}?`,message:n?`This also permanently removes its ${n} task${n===1?"":"s"}. This can’t be undone.`:"This can’t be undone.",confirmLabel:"Delete project",tone:"danger"});
    if(ok){deleteProject(project.id);toast(`${project.name} deleted`)}
    return ok;
  };
  return{fields,initialOf,save,remove};
}
function ProjectFormModal({form,actions,onClose}:{form:Exclude<ProjectForm,null>;actions:ReturnType<typeof useProjectActions>;onClose:()=>void}){
  const editing=form.mode==="edit"?form.project:undefined;
  return <RecordForm title={editing?`Edit ${editing.name}`:"Add project"} subtitle={editing?"Update this project.":"Create a project for a client."} fields={actions.fields} onClose={onClose}
    initial={actions.initialOf(editing,form.mode==="new"?form.stage:undefined)} submitLabel={editing?"Save changes":"Create project"}
    onSubmit={values=>{actions.save(values,editing);onClose()}} onDelete={editing?async()=>{if(await actions.remove(editing))onClose()}:undefined} deleteLabel="Delete project"/>;
}
const team=["LM","TM","SN","KM","OP","AR","HM"];
const teamFor=(project:Project)=>{const seed=Number(project.id.replace(/\D/g,""))||1;return [team[seed%team.length],team[(seed+2)%team.length]]};
const stageIcon={Backlog:Layers,"To Do":Square,"In Progress":Play,"In Review":Search,Completed:CheckCircle2} as const;
const stageAccent:Record<ProjectStage,string>={Backlog:"#8e9a9c","To Do":"#5b8def","In Progress":"var(--green)","In Review":"#f5a623",Completed:"#8e9a9c"};

export function ProjectsView(){
  const router=useRouter();
  const rowLink=useRowLink();
  const actions=useProjectActions();
  const[form,setForm]=useState<ProjectForm>(null);
  const{projects,clients}=useDemoData();
  const[q,setQ]=useState("");const[client,setClient]=useState("All Clients");const[status,setStatus]=useState("All Statuses");const[service,setService]=useState("All Services");
  const[selected,setSelected]=useState(projects[0]?.id);const[page,setPage]=useState(1);const[checked,setChecked]=useState<string[]>([]);const[sortName,setSortName]=useState<1|-1|0>(0);
  const pageSize=8;
  const clientName=(id:string)=>clients.find(c=>c.id===id)?.name??"";
  const services=Array.from(new Set(projects.map(p=>p.service)));
  const filtered=projects.filter(p=>(p.name+clientName(p.clientId)).toLowerCase().includes(q.toLowerCase())&&(client==="All Clients"||clientName(p.clientId)===client)&&(status==="All Statuses"||p.stage===status)&&(service==="All Services"||p.service===service));
  const rows=sortName===0?filtered:[...filtered].sort((a,b)=>a.name.localeCompare(b.name)*sortName);
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));const current=Math.min(page,pages);const pageRows=rows.slice((current-1)*pageSize,current*pageSize);
  const selectedProject=projects.find(p=>p.id===selected)??pageRows[0];
  const allChecked=pageRows.length>0&&pageRows.every(p=>checked.includes(p.id));
  const menuFor=(p:Project)=><RowMenu label={`Actions for ${p.name}`} items={[{label:"Open project",icon:ExternalLink,onClick:()=>router.push(`/projects/${p.id}`)},{label:"Edit project",icon:Pencil,onClick:()=>setForm({mode:"edit",project:p})},{label:"Delete project",icon:Trash2,tone:"danger",separatorBefore:true,onClick:()=>{void actions.remove(p)}}]}/>;
  return <>
    <PageHero eyebrow="Projects" title="Projects" subtitle="Plan, track and deliver all client work in one place."/>
    <div className="grid kpi-grid">
      <KpiCard iconLeft label="Active Projects" value={String(projects.filter(p=>p.stage!=="Completed").length)} icon={FolderKanban} active/>
      <KpiCard iconLeft label="In Review" value={String(projects.filter(p=>p.stage==="In Review").length)} icon={RotateCcw}/>
      <KpiCard iconLeft label="Completed (This month)" value={String(projects.filter(p=>p.stage==="Completed").length)} icon={CheckCircle2}/>
      <KpiCard iconLeft label="Due This Week" value="4" icon={CalendarDays}/>
    </div>
    <div className="toolbar"><SearchBox value={q} onChange={v=>{setQ(v);setPage(1)}} placeholder="Search projects…"/>
      <Select className="select" aria-label="Client" value={client} onChange={e=>{setClient(e.target.value);setPage(1)}}><option>All Clients</option>{clients.map(c=><option key={c.id}>{c.name}</option>)}</Select>
      <Select className="select" aria-label="Status" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option>All Statuses</option>{stages.map(s=><option key={s}>{s}</option>)}</Select>
      <Select className="select" aria-label="Service" value={service} onChange={e=>{setService(e.target.value);setPage(1)}}><option>All Services</option>{services.map(s=><option key={s}>{s}</option>)}</Select>
      <ViewToggle value="list" onChange={v=>{if(v==="grid")router.push("/projects/board")}}/><span style={{flex:1}}/><button className="button primary" onClick={()=>setForm({mode:"new"})}><Plus size={17}/>Add Project</button></div>
    <div className="split"><section className="panel">
      <div className="table-wrap"><table className="data-table"><thead><tr>
        <th style={{width:44}}><TableCheckbox label="Select all projects" checked={allChecked} onChange={on=>setChecked(on?Array.from(new Set([...checked,...pageRows.map(p=>p.id)])):checked.filter(id=>!pageRows.some(p=>p.id===id)))}/></th>
        <th><button type="button" className="th-sort" onClick={()=>setSortName(s=>s===1?-1:1)}>Project {sortName===-1?<ArrowDown size={13}/>:<ArrowUp size={13}/>}</button></th><th>Client</th><th>Service</th><th>Progress</th><th>Status</th><th>Due Date</th><th/></tr></thead>
        <tbody>{pageRows.map(p=><tr key={p.id} className={`${p.id===selectedProject?.id?"selected":""} clickable`} onMouseEnter={()=>setSelected(p.id)} {...rowLink(`/projects/${p.id}`)}>
          <td><TableCheckbox label={`Select ${p.name}`} checked={checked.includes(p.id)} onChange={on=>setChecked(on?[...checked,p.id]:checked.filter(id=>id!==p.id))}/></td>
          <td><strong>{p.name}</strong></td><td>{clientName(p.clientId)}</td><td>{p.service}</td><td><Progress value={p.progress}/></td><td><StatusBadge value={p.stage}/></td><td className="nowrap">{p.due}</td><td>{menuFor(p)}</td></tr>)}</tbody></table></div>
      {pageRows.length===0&&<div className="empty" style={{minHeight:160}}>No projects match these filters.</div>}
      <Pagination page={current} pageSize={pageSize} total={rows.length} noun="projects" onPage={setPage}/>
    </section>{selectedProject&&<ProjectInspector project={selectedProject} menu={menuFor(selectedProject)}/>}</div>
    {form&&<ProjectFormModal form={form} actions={actions} onClose={()=>setForm(null)}/>}
  </>;
}

function ProjectInspector({project,menu}:{project:Project;menu:React.ReactNode}){
  const{clients}=useDemoData();const client=clients.find(c=>c.id===project.clientId);const[tab,setTab]=useState("Overview");
  return <Panel>
    <div className="detail-title"><span className="logo-tile"><AppWindow size={20}/></span><div><h2><Link href={`/projects/${project.id}`}>{project.name}</Link></h2><small style={{color:"var(--muted)"}}>{client?.name}</small></div><span style={{marginLeft:"auto"}}>{menu}</span></div>
    <div className="tabs" style={{margin:"14px -18px 14px"}}>{["Overview","Tasks","Files","Communication","Notes"].map(x=><button key={x} className={`tab ${tab===x?"active":""}`} onClick={()=>setTab(x)}>{x}</button>)}</div>
    {tab==="Overview"?<>
      <div className="info-grid"><div className="info-box"><label>Status</label><StatusBadge value={project.stage}/></div><div className="info-box"><label>Progress</label><Progress value={project.progress}/></div>
        <div className="info-box"><label>Start Date</label><b>{project.start ?? "—"}</b></div><div className="info-box"><label>Due Date</label><b>{project.due}</b></div>
        <div className="info-box"><label>Service</label><b>{project.service}</b></div><div className="info-box"><label>Project Manager</label><b>{project.manager}</b></div></div>
      <p style={{color:"var(--muted)",lineHeight:1.7,margin:"14px 0"}}>{project.description}</p>
      <div className="info-box team-box" style={{marginBottom:14}}><label>Project Team</label><div style={{display:"flex",gap:8}}>{[...Array.from(new Set([...teamFor(project),"TM"])),"+2"].map(x=><span className="avatar" key={x}>{x}</span>)}</div></div>
    </>:<div className="empty" style={{minHeight:200}}><p>{tab} uses shared demonstration records.<br/>No live service is connected.</p></div>}
    <Link href="/emails" className="button outline" style={{width:"100%"}}><Mail size={16}/>Send Project Update</Link>
  </Panel>;
}

export function ProjectBoardView(){
  const router=useRouter();
  const actions=useProjectActions();
  const[form,setForm]=useState<ProjectForm>(null);
  const{projects,clients,tasks,moveProject}=useDemoData();
  const[active,setActive]=useState<Project|null>(null);
  const[q,setQ]=useState("");const[client,setClient]=useState("All Clients");const[service,setService]=useState("All Services");const[member,setMember]=useState("All Team Members");
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:5}}));
  const clientName=(id:string)=>clients.find(c=>c.id===id)?.name??"";
  const services=Array.from(new Set(projects.map(p=>p.service)));
  const visible=projects.filter(p=>(p.name+clientName(p.clientId)).toLowerCase().includes(q.toLowerCase())&&(client==="All Clients"||clientName(p.clientId)===client)&&(service==="All Services"||p.service===service)&&(member==="All Team Members"||teamFor(p).includes(member)));
  function end(e:DragEndEvent){const id=String(e.active.id);const over=String(e.over?.id??"");const stage=stages.includes(over as ProjectStage)?over as ProjectStage:projects.find(p=>p.id===over)?.stage;if(stage)moveProject(id,stage);setActive(null)}
  const checklist=(p:Project)=>{const own=tasks.filter(t=>t.projectId===p.id);return own.length?`${own.filter(t=>t.status==="Completed").length}/${own.length}`:null};
  const menuFor=(p:Project)=><RowMenu label={`Actions for ${p.name}`} size={16} items={[{label:"Open project",icon:ExternalLink,onClick:()=>router.push(`/projects/${p.id}`)},{label:"Edit project",icon:Pencil,onClick:()=>setForm({mode:"edit",project:p})},{label:"Delete project",icon:Trash2,tone:"danger",separatorBefore:true,onClick:()=>{void actions.remove(p)}}]}/>;
  return <>
    <PageHero eyebrow="Projects" title="View Projects" subtitle="Track and manage project work across all clients in a Kanban view."/>
    <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search projects…"/>
      <Select className="select" aria-label="Client" value={client} onChange={e=>setClient(e.target.value)}><option>All Clients</option>{clients.map(c=><option key={c.id}>{c.name}</option>)}</Select>
      <Select className="select" aria-label="Service" value={service} onChange={e=>setService(e.target.value)}><option>All Services</option>{services.map(s=><option key={s}>{s}</option>)}</Select>
      <Select className="select" aria-label="Team member" value={member} onChange={e=>setMember(e.target.value)}><option>All Team Members</option>{team.map(m=><option key={m}>{m}</option>)}</Select>
      <span style={{flex:1}}/><ViewToggle value="grid" onChange={v=>{if(v==="list")router.push("/projects")}}/></div>
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={e=>setActive(projects.find(p=>p.id===String(e.active.id))??null)} onDragEnd={end} onDragCancel={()=>setActive(null)}>
      <div className="kanban">{stages.map(stage=><ProjectColumn stage={stage} projects={visible.filter(p=>p.stage===stage)} clients={clients} checklist={checklist} onAdd={()=>setForm({mode:"new",stage})} menu={menuFor} key={stage}/>)}</div>
      <DragOverlay>{active&&<ProjectCard project={active} client={clientName(active.clientId)} checklist={checklist(active)} overlay/>}</DragOverlay>
    </DndContext>
    {form&&<ProjectFormModal form={form} actions={actions} onClose={()=>setForm(null)}/>}
    <p style={{color:"var(--muted)",fontSize:12,margin:"4px 0 0"}}>Drag a card between columns to change its stage. Changes save to this browser only.</p>
    <style jsx>{`.kanban{display:grid;grid-template-columns:repeat(5,minmax(230px,1fr));gap:12px;overflow-x:auto;padding-bottom:14px;min-height:560px}`}</style>
  </>;
}

function ProjectColumn({stage,projects,clients,checklist,onAdd,menu}:{stage:ProjectStage;projects:Project[];clients:{id:string;name:string}[];checklist:(p:Project)=>string|null;onAdd:()=>void;menu:(p:Project)=>React.ReactNode}){
  const{setNodeRef,isOver}=useDroppable({id:stage});const Icon=stageIcon[stage];
  return <section ref={setNodeRef} className="board-column" style={{background:isOver?"var(--green-soft)":"var(--panel)"}}>
    <header><span className="col-title"><Icon size={18} color={stage==="In Progress"||stage==="Completed"?"var(--green)":undefined}/>{stage}</span><span className="col-meta"><b>{projects.length}</b><MoreHorizontal size={16}/></span></header>
    <div>{projects.map(p=><ProjectCard key={p.id} project={p} client={clients.find(c=>c.id===p.clientId)?.name??""} checklist={checklist(p)} menu={menu(p)}/>)}</div>
    <button className="board-add" onClick={onAdd}><Plus size={15}/> Add Project</button>
    <style jsx>{`.board-column{border:1px solid var(--border);display:flex;flex-direction:column;min-height:520px;transition:background .15s}.board-column>header{display:flex;justify-content:space-between;align-items:center;padding:14px;font-family:var(--font-display);font-size:18px}.col-title,.col-meta{display:inline-flex;align-items:center;gap:10px}.col-meta{color:var(--muted)}.board-column>header b{font:11px var(--font-body);color:var(--text);background:color-mix(in srgb,var(--muted) 24%,transparent);padding:5px 9px}.board-column>div{padding:0 10px 8px;flex:1}.board-add{margin:0 10px 10px;border:1px solid var(--border);background:transparent;color:var(--text);height:42px;display:flex;align-items:center;justify-content:center;gap:7px}.board-add:hover{border-color:var(--green)}`}</style>
  </section>;
}

function ProjectCard({project,client,checklist,overlay=false,menu}:{project:Project;client:string;checklist:string|null;overlay?:boolean;menu?:React.ReactNode}){
  const{attributes,listeners,setNodeRef,transform,isDragging}=useDraggable({id:project.id});
  const done=project.stage==="Completed";const showProgress=project.stage==="In Progress"||project.stage==="In Review";
  return <article ref={setNodeRef} {...listeners} {...attributes} className="project-card" style={{transform:CSS.Translate.toString(transform),opacity:isDragging?.35:1,boxShadow:overlay?"0 20px 60px rgba(0,0,0,.45)":"none",borderLeft:`4px solid ${stageAccent[project.stage]}`}}>
    <div className="card-top-row"><small className="card-client">{client}</small>{menu}</div><b className="card-name">{project.name}</b>
    <span className="chip">{project.service}</span>
    {showProgress&&<Progress value={project.progress}/>}
    <footer>
      {done?<><span className="badge green">✓ Completed</span><span className="due">{project.due}</span></>
      :<><span className="meta">{checklist&&<><CheckSquare size={13}/>{checklist}</>}<CalendarDays size={13}/>{project.due}</span><span className="avatars">{teamFor(project).map(x=><span className="avatar sm" key={x}>{x}</span>)}</span></>}
    </footer>
    <style jsx>{`.project-card{display:flex;flex-direction:column;gap:8px;border:1px solid var(--border);background:var(--panel-strong);padding:12px 12px 10px;margin-bottom:8px;touch-action:none;cursor:grab}.card-top-row{display:flex;align-items:center;justify-content:space-between;margin:-4px -4px 0 0}.card-client{color:var(--muted);font-size:12px}.card-name{font-size:15px;font-weight:500}.chip{align-self:flex-start;background:color-mix(in srgb,var(--muted) 22%,transparent);padding:3px 9px;font-size:11px}.project-card footer{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--muted);font-size:11px;margin-top:4px}.meta{display:inline-flex;align-items:center;gap:7px}.avatars{display:inline-flex;gap:4px}.due{color:var(--text)}`}</style>
  </article>;
}

export function ProjectDetailView({projectId}:{projectId:string}){const router=useRouter();const actions=useProjectActions();const[form,setForm]=useState<ProjectForm>(null);const rowLink=useRowLink();const{projects,clients,tasks}=useDemoData();const p=projects.find(p=>p.id===projectId);if(!p)return <><PageHero eyebrow="Projects" title="Project not found" subtitle="This project may have been deleted."/><Link href="/projects" className="button">Back to projects</Link></>;const client=clients.find(c=>c.id===p.clientId);return <><PageHero eyebrow="Projects / Delivery workspace" title={p.name} subtitle={`${client?.name} · ${p.service}`}/><div className="toolbar"><Link href="/projects" className="button">Projects</Link><span style={{flex:1}}/><button className="button" onClick={()=>setForm({mode:"edit",project:p})}><Pencil size={16}/>Edit project</button><button className="button danger-ghost" onClick={async()=>{if(await actions.remove(p))router.push("/projects")}}><Trash2 size={16}/>Delete</button></div><div className="detail-grid"><Panel title="Project overview"><p style={{color:"var(--muted)",lineHeight:1.7}}>{p.description}</p><div className="info-grid"><div className="info-box"><label>Status</label><StatusBadge value={p.stage}/></div><div className="info-box"><label>Progress</label><Progress value={p.progress}/></div><div className="info-box"><label>Due date</label><b>{p.due}</b></div><div className="info-box"><label>Manager</label><b>{p.manager}</b></div></div></Panel><Panel title="Project team"><div style={{display:"flex",gap:10}}>{["LM","TM","SN","OP"].map(x=><span className="profile" key={x}>{x}</span>)}</div><button className="button" style={{marginTop:18}}><Users size={16}/>Manage team</button></Panel><section className="panel table-wrap wide"><table className="data-table"><thead><tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead><tbody>{tasks.filter(t=>t.projectId===p.id).map(t=><tr key={t.id} className="clickable" {...rowLink(`/tasks/${t.id}`)}><td><strong>{t.title}</strong></td><td>{t.assignee}</td><td>{t.priority}</td><td><StatusBadge value={t.status}/></td><td>{t.due}</td></tr>)}</tbody></table></section></div>{form&&<ProjectFormModal form={form} actions={actions} onClose={()=>setForm(null)}/>}<style jsx>{`.detail-grid{display:grid;grid-template-columns:1.4fr .6fr;gap:14px}.wide{grid-column:1/-1}@media(max-width:800px){.detail-grid{grid-template-columns:1fr}.wide{grid-column:auto}}`}</style></>}
