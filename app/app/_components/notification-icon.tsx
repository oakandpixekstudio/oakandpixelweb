"use client";

import { CircleDollarSign, FolderKanban, Handshake, ListChecks, Mail, UserPlus, type LucideIcon } from "lucide-react";
import type { AppNotification } from "@/_types";

const icons: Record<AppNotification["type"], LucideIcon> = {
  email: Mail, invoice: CircleDollarSign, task: ListChecks, project: FolderKanban, client: UserPlus, pipeline: Handshake,
};

export function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  const Icon = icons[type];
  return <span className="notif-icon"><Icon size={17}/></span>;
}
