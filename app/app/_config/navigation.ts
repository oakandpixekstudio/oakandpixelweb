import { ChartNoAxesColumn, FileText, Folder, Funnel, Layers, LayoutGrid, List, Mail, Search, Settings, UserPlus } from "lucide-react";

export const navigation = [
  { label: "CORE", items: [
    { href: "/overview", label: "Overview", icon: LayoutGrid },
    { href: "/clients", label: "Clients", icon: UserPlus },
    { href: "/projects", label: "Projects", icon: Funnel },
    { href: "/pipeline", label: "Pipeline", icon: Folder },
    { href: "/tasks", label: "Tasks", icon: List },
  ]},
  { label: "COMMUNICATION", items: [
    { href: "/emails", label: "Emails", icon: Mail, unread: true },
    { href: "/templates", label: "Templates", icon: FileText },
  ]},
  { label: "BUSINESS", items: [
    { href: "/invoices", label: "Invoices", icon: Layers },
    { href: "/reports", label: "Reports", icon: ChartNoAxesColumn },
  ]},
  { label: "WEBSITE AUDIT", items: [
    { href: "/website-audit", label: "Website Audit", icon: Search },
  ]},
  { label: "SETTINGS", items: [
    { href: "/settings", label: "Settings", icon: Settings },
  ]},
];
