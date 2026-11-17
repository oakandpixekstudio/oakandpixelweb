import type { Client, EmailMessage, Invoice, Opportunity, Project, Task, Template } from "@/_types";

export const clients: Client[] = [
  { id:"trellis", name:"Trellis Capital", initials:"TC", since:"14 Mar 2025", service:"Website & CMS", status:"Active", contact:"Lerato Maseko", email:"lerato@trelliscapital.co.za", phone:"+27 82 345 6789", industry:"Investment & Advisory", pipeline:320000, billed:980000 },
  { id:"mavena", name:"Mavena Group", initials:"MG", since:"02 Jun 2025", service:"Website Redesign", status:"Active", contact:"Thandi Moyo", email:"thandi@mavena.co.za", phone:"+27 83 218 4410", industry:"Professional Services", pipeline:540000, billed:620000 },
  { id:"rivermere", name:"Rivermere Consulting", initials:"RC", since:"21 Aug 2025", service:"New Website", status:"Proposal", contact:"Sizwe Dlamini", email:"sizwe@rivermere.co.za", phone:"+27 72 990 2143", industry:"Consulting", pipeline:390000, billed:180000 },
  { id:"aurelia", name:"Aurelia Properties", initials:"AP", since:"09 Jan 2025", service:"Website & SEO", status:"Active", contact:"Anele Ncube", email:"anele@aurelia.co.za", phone:"+27 79 502 1880", industry:"Property", pipeline:200000, billed:740000 },
  { id:"lumen", name:"Lumen Infrastructure", initials:"LI", since:"30 Sep 2025", service:"Marketing Site", status:"Discovery", contact:"Kagiso Motsepe", email:"kagiso@lumeninfra.co.za", phone:"+27 76 310 1142", industry:"Infrastructure", pipeline:180000, billed:160000 },
  { id:"northgate", name:"Northgate Resources", initials:"NR", since:"11 Feb 2025", service:"Corporate Website", status:"On Hold", contact:"Mia Adams", email:"mia@northgate.co.za", phone:"+27 84 413 1209", industry:"Resources", pipeline:0, billed:280000 },
  { id:"cedar", name:"Cedar & Co.", initials:"CC", since:"05 Apr 2025", service:"Brand & Website", status:"Active", contact:"Yusuf Khan", email:"yusuf@cedarandco.co.za", phone:"+27 81 669 0202", industry:"Consumer", pipeline:160000, billed:420000 },
  { id:"stonefield", name:"Stonefield Energy", initials:"SE", since:"18 Jul 2025", service:"Website & CMS", status:"Active", contact:"Nandi Peters", email:"nandi@stonefield.co.za", phone:"+27 74 170 8821", industry:"Energy", pipeline:480000, billed:510000 }
];

export const projects: Project[] = [
  { id:"p1", name:"Corporate Website Redesign", start:"03 Nov 2026", clientId:"trellis", service:"Website & CMS", stage:"In Progress", progress:72, due:"24 Nov 2026", manager:"Lerato Maseko", description:"A complete editorial redesign of the corporate website and content platform." },
  { id:"p2", name:"Brand & Website (v2)", start:"12 Oct 2026", clientId:"mavena", service:"Brand & Website", stage:"In Review", progress:45, due:"28 Nov 2026", manager:"Thandi Moyo", description:"Brand refresh and conversion-focused website system." },
  { id:"p3", name:"New Marketing Site", start:"19 Oct 2026", clientId:"rivermere", service:"New Website", stage:"In Progress", progress:90, due:"20 Nov 2026", manager:"Sizwe Dlamini", description:"A focused lead generation site for a consulting practice." },
  { id:"p4", name:"SEO & Content Setup", start:"05 Oct 2026", clientId:"aurelia", service:"Website & SEO", stage:"Completed", progress:100, due:"14 Nov 2026", manager:"Anele Ncube", description:"Technical SEO, analytics and content foundation." },
  { id:"p5", name:"Property Platform (MVP)", start:"26 Oct 2026", clientId:"aurelia", service:"Web App", stage:"In Progress", progress:38, due:"05 Dec 2026", manager:"Lerato Maseko", description:"A searchable property experience and enquiry workflow." },
  { id:"p6", name:"Marketing Site Refresh", start:"09 Nov 2026", clientId:"lumen", service:"Marketing Site", stage:"To Do", progress:12, due:"01 Dec 2026", manager:"Kagiso Motsepe", description:"Refresh messaging, performance and capability pages." },
  { id:"p7", name:"Corporate Website", start:"30 Nov 2026", clientId:"northgate", service:"Website & CMS", stage:"Backlog", progress:0, due:"12 Dec 2026", manager:"Thandi Moyo", description:"Corporate site discovery and content planning." },
  { id:"p8", name:"Brand Identity & Site", start:"07 Dec 2026", clientId:"cedar", service:"Brand & Website", stage:"To Do", progress:0, due:"19 Dec 2026", manager:"Anele Ncube", description:"Brand system and commerce-ready marketing website." }
];

export const opportunities: Opportunity[] = [
  { id:"o1", clientId:"lumen", name:"Lumen Infrastructure", service:"Marketing Site", stage:"Lead", value:180000, owner:"KM" },
  { id:"o2", clientId:"northgate", name:"Northgate Resources", service:"Corporate Website", stage:"Lead", value:260000, owner:"AR" },
  { id:"o3", clientId:"cedar", name:"Cedar & Co.", service:"Brand & Website", stage:"Qualified", value:160000, owner:"TP" },
  { id:"o4", clientId:"stonefield", name:"Stonefield Energy", service:"Website & CMS", stage:"Qualified", value:480000, owner:"SM" },
  { id:"o5", clientId:"rivermere", name:"Rivermere Consulting", service:"New Website", stage:"Proposal", value:390000, owner:"KR" },
  { id:"o6", clientId:"mavena", name:"Mavena Group", service:"Website Redesign", stage:"Negotiation", value:540000, owner:"HM" },
  { id:"o7", clientId:"trellis", name:"Trellis Capital", service:"Website & CMS", stage:"Won", value:320000, owner:"TC" },
  { id:"o8", clientId:"aurelia", name:"Aurelia Properties", service:"Brand & Website", stage:"Won", value:200000, owner:"AP" }
];

export const tasks: Task[] = [
  { id:"t1", title:"Finalize homepage design", projectId:"p1", assignee:"LM", priority:"High", status:"In Progress", due:"20 Nov 2026", progress:72, description:"Complete the final homepage design including revisions from the latest client feedback." },
  { id:"t2", title:"Review brand guidelines", projectId:"p2", assignee:"TM", priority:"Medium", status:"In Review", due:"21 Nov 2026", progress:90, description:"Review the final identity system and prepare feedback." },
  { id:"t3", title:"Implement SEO recommendations", projectId:"p4", assignee:"SN", priority:"High", status:"In Progress", due:"18 Nov 2026", progress:64, description:"Implement metadata, redirects and search fundamentals." },
  { id:"t4", title:"Set up analytics and tracking", projectId:"p6", assignee:"KM", priority:"Medium", status:"To Do", due:"24 Nov 2026", progress:15, description:"Configure the demonstration analytics plan." },
  { id:"t5", title:"Content upload and QA", projectId:"p5", assignee:"OP", priority:"Medium", status:"To Do", due:"25 Nov 2026", progress:20, description:"Upload approved content and complete responsive QA." },
  { id:"t6", title:"Client feedback updates", projectId:"p3", assignee:"AR", priority:"Low", status:"To Do", due:"27 Nov 2026", progress:40, description:"Apply the consolidated client feedback." },
  { id:"t7", title:"Prepare project deployment", projectId:"p5", assignee:"HM", priority:"High", status:"In Progress", due:"22 Nov 2026", progress:55, description:"Prepare deployment checklist and handover plan." },
  { id:"t8", title:"Handover documentation", projectId:"p6", assignee:"LM", priority:"Low", status:"To Do", due:"28 Nov 2026", progress:10, description:"Prepare concise client handover documentation." }
];

export const emails: EmailMessage[] = [
  { id:"e1", clientId:"trellis", projectId:"p1", folder:"Inbox", from:"Naledi Mokoena", subject:"Website content for review", preview:"Hi team, please find the updated website content...", body:"Hi team,\n\nPlease find the updated website content for your review. We’ve incorporated the changes discussed in our last meeting, including the revised service positioning and key messaging.\n\nKindly review and share any feedback by Thursday, 19 Nov.\n\nRegards,\nNaledi Mokoena\nHead of Marketing · Trellis Capital", time:"14:21", unread:true, attachments:["Website_Content_v2.docx", "Messaging_Framework.pdf"] },
  { id:"e2", clientId:"mavena", projectId:"p2", folder:"Inbox", from:"Thandi Moyo", subject:"Project update — design v2", preview:"Good day, the design v2 is now ready for your review...", body:"Good day,\n\nThe second design direction is ready for your review. Please use the consolidated feedback document for comments.\n\nThank you,\nThandi", time:"11:08", starred:true },
  { id:"e3", clientId:"aurelia", projectId:"p4", folder:"Inbox", from:"Anele Ncube", subject:"SEO scope and next steps", preview:"Thanks for the call earlier. As discussed, here is the...", body:"Thanks for the call earlier. As discussed, here is the confirmed SEO scope and the next steps for launch.", time:"Yesterday" },
  { id:"e4", clientId:"rivermere", projectId:"p3", folder:"Sent", from:"Oak & Pixel", subject:"Proposal and scope of work", preview:"Please find attached the Proposal and Scope of Work...", body:"Hi Sizwe,\n\nPlease find attached our proposal and scope of work. This is a demonstration message and has not been sent.\n\nOak & Pixel", time:"Yesterday", attachments:["Rivermere_Proposal.pdf"] },
  { id:"e5", clientId:"lumen", projectId:"p6", folder:"Drafts", from:"Oak & Pixel", subject:"Onboarding — next steps", preview:"Welcome to Oak & Pixel. Here are the next steps for...", body:"Welcome to Oak & Pixel. Here are the next steps for your website project.", time:"16 Nov" },
  { id:"e6", clientId:"cedar", projectId:"p8", folder:"Inbox", from:"Yusuf Khan", subject:"Brand assets", preview:"Sharing the latest brand assets and guidelines for...", body:"Sharing the latest brand assets and guidelines for the new website.", time:"16 Nov", attachments:["Cedar_Brand_Assets.zip"] }
];

export const templates: Template[] = [
  { id:"tm1", name:"Client Project Update", type:"Email", service:"All Services", updated:"16 Nov 2026", body:"Hi {{Client Name}},\n\nHere’s a quick update on your project, {{Project Name}}.\n\nCurrent status: {{Project Status}}\nProgress: {{Progress Percentage}}%\n\nKey updates, next steps and any items requiring your input are outlined below.\n\nRegards,\nThe Oak & Pixel Team" },
  { id:"tm2", name:"Proposal (Growth Retainer)", type:"Proposal", service:"Marketing", updated:"14 Nov 2026", body:"A focused growth partnership proposal prepared for {{Client Name}}." },
  { id:"tm3", name:"Quote — Implementation", type:"Quote", service:"Technology", updated:"12 Nov 2026", body:"Implementation estimate and delivery assumptions." },
  { id:"tm4", name:"Service Agreement (Standard)", type:"Contract", service:"All Services", updated:"10 Nov 2026", body:"Standard service agreement — demonstration content only." },
  { id:"tm5", name:"Monthly Performance Report", type:"Report", service:"All Services", updated:"08 Nov 2026", body:"Performance summary for {{Reporting Period}}." },
  { id:"tm6", name:"Project Kick-off", type:"Email", service:"All Services", updated:"07 Nov 2026", body:"Welcome. We’re looking forward to starting your project." }
];

export const invoices: Invoice[] = [
  { id:"INV-00428", clientId:"trellis", projectId:"p1", status:"Paid", issueDate:"10 Nov 2026", dueDate:"17 Nov 2026", taxRate:15, paid:276000, items:[{description:"Website design and development",quantity:1,unitPrice:180000},{description:"Content migration and CMS setup",quantity:1,unitPrice:40000},{description:"Training and handover",quantity:1,unitPrice:20000}] },
  { id:"INV-00429", clientId:"mavena", projectId:"p2", status:"Sent", issueDate:"12 Nov 2026", dueDate:"26 Nov 2026", taxRate:15, paid:0, items:[{description:"Brand and website design",quantity:1,unitPrice:240000}] },
  { id:"INV-00430", clientId:"rivermere", projectId:"p3", status:"Draft", issueDate:"15 Nov 2026", dueDate:"30 Nov 2026", taxRate:15, paid:0, items:[{description:"Website implementation",quantity:1,unitPrice:160000}] },
  { id:"INV-00417", clientId:"aurelia", projectId:"p4", status:"Overdue", issueDate:"20 Oct 2026", dueDate:"03 Nov 2026", taxRate:15, paid:50000, items:[{description:"SEO and content setup",quantity:1,unitPrice:120000}] }
];
