# Oak & Pixel CRM | Documentation Index

**Version:** 1.0 working specification  
**Prepared:** 17 November 2026  
**Product:** Oak & Pixel Workspace (working application name)  
**Audience:** Owner, product lead, designer, frontend engineer, backend engineer, QA and deployment owner  
**Status:** Implementation-ready planning baseline; unresolved decisions are explicitly marked.

## Product in one sentence

A focused, premium internal CRM for a website agency: manage clients, opportunities, projects, tasks, email, templates, invoices and performance from one connected workspace.

**The non-negotiable visual rule is zero rounded corners.** All interface components have sharp, 90-degree edges in light and dark themes. The experience should feel fluid, restrained and precise, not overloaded with effects.

## Contents

| File | Purpose | Primary owner |
| --- | --- | --- |
| [01 - PRD](01_PRODUCT_REQUIREMENTS_PRD.md) | What to build, for whom, priorities and acceptance criteria | Product |
| [02 - TRD](02_TECHNICAL_REQUIREMENTS_TRD.md) | Architecture, stack, performance, reliability, NFRs | Engineering |
| [03 - Application Flow](03_APPLICATION_FLOW.md) | Routes, page states and end-to-end user journeys | Product + UX |
| [04 - Security and Access](04_SECURITY_AND_ACCESS.md) | Roles, authorization, secrets, auditability and threat controls | Security + backend |
| [05 - Brand Identity and Design System](05_BRAND_IDENTITY_AND_DESIGN_SYSTEM.md) | Brand voice, visual tokens, components, motion and accessibility | Design + frontend |
| [06 - Backend Schema and Data Model](06_BACKEND_SCHEMA_AND_DATA_MODEL.md) | Entities, relationships, constraints and storage model | Backend + DBA |
| [07 - API Contracts and Integrations](07_API_CONTRACTS_AND_INTEGRATIONS.md) | Application endpoints, validation, async contracts and errors | Backend |
| [08 - Titan Email and Communications](08_TITAN_EMAIL_AND_COMMUNICATIONS.md) | GoDaddy Titan mail connection, synchronization and UX | Integrations |
| [09 - QA and UAT Plan](09_QA_AND_UAT_PLAN.md) | Test strategy, high-risk scenarios and exit criteria | QA + owner |
| [10 - Deployment and Operations](10_DEPLOYMENT_AND_OPERATIONS.md) | Environments, release workflow, backups, alerts, runbooks | DevOps |
| [11 - Implementation Roadmap](11_IMPLEMENTATION_ROADMAP.md) | Sequence, dependencies and scope gates | Delivery lead |
| [12 - Reporting Metrics and KPIs](12_REPORTING_METRICS_AND_KPIS.md) | Precise metric definitions and data consistency | Product + finance |
| [13 - Privacy and Data Governance](13_PRIVACY_AND_DATA_GOVERNANCE.md) | POPIA controls, retention and data subject workflows | Information Officer |
| [14 - Decisions, Risks and Sign-off](14_DECISION_LOG_AND_ACCEPTANCE.md) | Assumptions requiring approval, major risks and release decisions | Owner |
| [15 - Development Backlog and User Stories](15_DEVELOPMENT_BACKLOG_AND_USER_STORIES.md) | Ordered epics, actionable stories, acceptance conditions | Delivery + engineering |

## What has been agreed vs. proposed

### Confirmed direction

- This is a **separate Oak & Pixel website-agency CRM**, not a HIMARK product.
- It must remain **straightforward and focused**, despite sophisticated engineering and visual execution.
- Pages designed so far: sign-in, overview, clients, client detail, projects, project Kanban, pipeline, tasks, emails, templates, invoices, invoice detail, reports and settings.
- Two themes: premium **dark** and **light**, toggle in persistent header.
- Brand direction: architectural imagery, near-black charcoal, mineral white, restrained green, editorial serif display type and clean UI sans serif.
- **No rounded corners whatsoever** on buttons, fields, cards, tabs, badges, navigation, overlays, loading placeholders, etc. Global border radius = 0.
- Premium interactions: polished micro-motion, skeletons, smooth navigation, optimistic Kanban updates, accessible and responsive UI.
- Foundation: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui-style accessible primitives, Motion, TanStack Query/Table, dnd-kit, Supabase PostgreSQL/Auth, background jobs and Sentry.
- **Email provider:** GoDaddy Professional Email powered by Titan using IMAP/SMTP; Microsoft 365 is **not a dependency**.

### Proposed working assumptions (approval required; see file 14)

- V1 is an **internal staff workspace**, with invite-only users. A separate external client login/portal is not in V1. Therefore the mockup label `CLIENT PORTAL` should change to `TEAM WORKSPACE` or equivalent when implemented.
- V1 includes functional email templates; full document-template generation and a customer self-service portal may follow later.
- Payments are manually recorded and reconciled in V1; payment gateways and accounting integrations are deferred.
- One Oak & Pixel business workspace at launch, with a workspace ID in the model to support future growth.
- Any businesses, addresses, financial figures and contacts appearing in design mockups are **illustrative sample data**, not real production records.

## Scope guardrail

Do not confuse **design completeness** with a requirement to implement every possible enterprise feature. Build the focused V1 workflows first. No microservices, Kubernetes, large workflow engines, AI assistant, marketing automation suite or full general-ledger accounting in the initial release.

## How to work from this pack

1. Approve the outstanding decisions in file 14.
2. Treat the PRD requirement IDs (`FR-*`) as the functional source of truth.
3. Use the TRD, data model and API specs to implement those requirements, not as permission to invent extra product scope.
4. Use file 05 as the visual authority; screenshots are **reference only**, and specifications override visual inconsistencies.
5. Test against file 09 before production launch; file 10 governs operational release.
6. Update file 14 whenever a material decision changes.

## Visual references

These are existing design concepts bundled for handoff, not export-ready design assets. They can contain rounded details or placeholder values that must **not** override the zero-radius design system.

- [Login reference](design_references/login_reference.png)
- [Dark dashboard reference](design_references/dark_dashboard_reference.png)
- [Light dashboard reference](design_references/light_dashboard_reference.png)
- [Clients reference](design_references/client_detail_reference.png)
- [Email reference](design_references/email_reference.png)
- [Invoice detail reference](design_references/invoice_detail_reference.png)

## Verified external reference notes

Vendor references are informative, not substitutes for checking the live account configuration and applicable license/terms at implementation.

- GoDaddy Titan incoming/outgoing settings: <https://se.godaddy.com/help/use-imap-settings-to-add-my-professional-email-powered-by-titan-to-a-client-32204?lc=en-US>
- GoDaddy Titan SMTP for website/plugin integrations: <https://www.godaddy.com/help/set-up-third-party-plugins-or-websites-using-smtp-settings-42788>
- Titan application passwords for 2FA accounts: <https://support.titan.email/hc/en-us/articles/59899461438233-Application-Password-in-Titan-for-Third-Party-Clients>
- Supabase RLS: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- OWASP ASVS: <https://devguide.owasp.org/en/08-culture-process/04-asvs/>
- South African POPIA (Act 4 of 2013): <https://inforegulator.org.za/wp-content/uploads/2025/08/PROTECTION-OF-PERSONAL-INFORMATION-ACT-4-OF-2013.pdf>

## Document control

- **Baseline date:** 17 November 2026.
- **Revision policy:** Increment the version and record changed assumptions, scope, security controls and migrations in file 14.
- **Approval:** Owner sign-off pending, particularly for billing policies, mail visibility, storage geography and legal retention.
