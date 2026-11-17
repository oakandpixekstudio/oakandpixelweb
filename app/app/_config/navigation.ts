import { BarChart3, BriefcaseBusiness, Building2, ClipboardList, FileStack, FolderKanban, Gauge, Mail, Settings, Users } from "lucide-react";

export const navigation = [
  { label: "CORE", items: [
    { href: "/overview", label: "Overview", icon: Gauge },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/pipeline", label: "Pipeline", icon: BriefcaseBusiness },
    { href: "/tasks", label: "Tasks", icon: ClipboardList },
  ]},
  { label: "COMMUNICATION", items: [
    { href: "/emails", label: "Emails", icon: Mail, unread: true },
    { href: "/templates", label: "Templates", icon: FileStack },
  ]},
  { label: "BUSINESS", items: [
    { href: "/invoices", label: "Invoices", icon: Building2 },
    { href: "/reports", label: "Reports", icon: BarChart3 },
  ]},
  { label: "SETTINGS", items: [
    { href: "/settings", label: "Settings", icon: Settings },
  ]},
];
