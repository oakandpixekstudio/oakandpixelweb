"use client";

import { AutomationPanel, EmailSettings, IntegrationsPanel, InvoicingPayments, NotificationSettings, ProjectSettings } from "@/_features/settings-config";
import { AuditLog, DataImport } from "@/_features/settings-data";
import { PeopleAccess, PipelineStages, RolesPermissions, ServicesOfferings } from "@/_features/settings-people";
import { SettingsStyles } from "@/_features/settings-ui";

/** The body of every Settings tab except Organisation Profile. */
export function SettingsPanel({ section }: { section: string }) {
  return <>
    <SettingsStyles/>
    {section === "People & Access" ? <PeopleAccess/>
      : section === "Roles & Permissions" ? <RolesPermissions/>
      : section === "Services & Offerings" ? <ServicesOfferings/>
      : section === "Pipeline & Stages" ? <PipelineStages/>
      : section === "Project Settings" ? <ProjectSettings/>
      : section === "Invoicing & Payments" ? <InvoicingPayments/>
      : section === "Email & Integrations" ? <EmailSettings/>
      : section === "Automation" ? <AutomationPanel/>
      : section === "Notifications" ? <NotificationSettings/>
      : section === "Data & Import" ? <DataImport/>
      : section === "Integrations" ? <IntegrationsPanel/>
      : section === "Audit Log" ? <AuditLog/>
      : null}
  </>;
}
