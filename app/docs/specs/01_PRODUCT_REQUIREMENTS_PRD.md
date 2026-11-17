# Product Requirements Document (PRD)

**Product:** Oak & Pixel Workspace  
**Version:** 1.0 working specification  
**Date:** 17 November 2026  
**Status:** Scope baseline; items marked `Decision required` are not approved policies.

## 1. Executive summary

Oak & Pixel is a website agency that needs a single, intentionally simple internal workspace to maintain client relationships, move deals forward, deliver websites, communicate by email and keep invoices visible. The product should feel premium because of clarity, response time and meticulous interaction design, not because it has excessive features.

### Problem

Agency information is easily fragmented across spreadsheets, a mailbox, chat, project tools and invoice documents. Staff lose context, duplicate updates, overlook follow-ups and struggle to understand client/project status.

### Product promise

**Every client, project, conversation and next action in one coherent place.** The owner can answer: Who needs attention? What needs delivering? Which deals are likely to close? Which invoices are outstanding?

## 2. Goals and measurable success criteria

| Goal | V1 success signal |
| --- | --- |
| Single source of truth | One client profile links contacts, projects, emails, notes and invoices without duplicate entry |
| Simple daily operations | A normal user can find a client, open its project and send an email within a few intuitive steps |
| Reliable mail communication | Sent mail has a confirmed result; received mail sync is monitored; failures are visible and recoverable |
| Predictable project delivery | Projects/tasks move through visible stages; owners and due dates are easy to see |
| Premium feel | Keyboard-accessible controls, fast interactions, restrained motion, useful skeleton states, sharp-edge UI |
| Financial visibility | Invoice status, paid amounts and outstanding balance match itemized transaction records |

## 3. Users, access and product boundaries

- **Owner/Admin:** oversight, settings, team membership, business-wide operational data.
- **Project Manager/Account Manager:** clients, projects, assignments, opportunities and relevant conversations.
- **Contributor:** assigned project/task execution and permitted client context.
- **Finance:** invoices, payments and financial reporting, subject to explicit permissions.

**V1 boundary:** internal team only; no public sign-up and no direct external-client login. The login graphic that reads `CLIENT PORTAL` is a concept and will be changed to an internal-workspace label unless the owner authorizes a separate client portal.

## 4. Functional scope by priority

### P0 - Required for launch

| ID | Requirement | Core acceptance criterion |
| --- | --- | --- |
| FR-001 | Sign-in and secure session | Only invited, active team members can authenticate and access authorized pages |
| FR-002 | Overview dashboard | Current user sees key client/project/pipeline/invoice metrics plus next actions, with clear source and period |
| FR-003 | Client directory | Create, edit, search, filter and archive clients; avoid duplicate active records |
| FR-004 | Client profile | View contacts, notes, projects, linked emails, invoices and activity in one place |
| FR-005 | Contact management | Multiple named contacts per client with role, email, phone and primary-contact designation |
| FR-006 | Project management | Create/edit project; associate with one client; owner, status, service, dates, description and progress |
| FR-007 | Project Kanban | View projects by stage; move by drag-and-drop with save/rollback and accessible non-drag alternative |
| FR-008 | Task management | Create/edit/assign tasks; status, due date, priority, project link, comments and completion |
| FR-009 | Sales pipeline | Create and move opportunities through Lead, Qualified, Proposal, Negotiation, Won and Lost; value, owner, close date |
| FR-010 | Titan mailbox connection | Authorized admin connects GoDaddy Titan IMAP/SMTP; connection status visible; credentials remain server-side |
| FR-011 | Email workspace | Search, read, compose, send, reply, forward and view message/attachment metadata |
| FR-012 | Linked communications | Messages can be linked to a client and optionally a project, with manual correction if ambiguous |
| FR-013 | Email templates | Save, edit, preview and apply branded email templates with validated variable substitutions |
| FR-014 | Invoice tracking | Create draft invoice with line items and tax; issue, send, record payment, view balance and export PDF |
| FR-015 | Reports | Operational summaries for clients, pipeline, project workload, invoicing and cash received |
| FR-016 | Settings | Organization, people/access, email connection, service catalogue, theme and preferences |
| FR-017 | Activity and audit | Material client, deal, project, invoice, access and mail configuration actions produce traceable events |
| FR-018 | Responsive themes | Full dark/light modes, keyboard support, saved theme choice, **zero-radius component system** |

### P1 - Important, but not a release blocker unless prioritized by owner

| ID | Requirement | Notes |
| --- | --- | --- |
| FR-019 | Scheduled email delivery | Queue and monitor scheduled client emails; cancel before dispatch |
| FR-020 | Reusable proposal/quote templates | Document preview and download; review legal/financial wording before automation |
| FR-021 | Automated reminders | Due tasks, overdue invoices and follow-up reminders; configurable opt-in |
| FR-022 | Bulk CSV import/export | Clients and contacts with duplicate checking and export logs |
| FR-023 | Team utilization | Based on explicitly captured assignments; no invented timesheets |
| FR-024 | Advanced mailbox actions | Archive/delete/flag across Titan when confirmed safe and supported by provider |

### P2 - Future possibilities, excluded from V1 estimate

External client portal, online payments, general-ledger bookkeeping, e-signatures, multi-business SaaS tenancy, campaign marketing, AI copilot and custom workflow builder. Do not render inactive future features as if they work.

## 5. Main page specification

| Page | Main content | Primary action |
| --- | --- | --- |
| Sign in | Compact centered form over architectural background | Sign in / reset password |
| Overview | Key KPIs, pipeline summary, projects, recent mail/activity | Open relevant record / quick create |
| Clients | Search/filter table and selected-client preview | Add client / view full client |
| Client detail | Tabs: Overview, Projects, Communication, Invoices, Files, Contacts, Activity | Email, add project, log note |
| Projects | Searchable project table, progress, owner and detail pane | New project / open project |
| Project Kanban | Backlog, To Do, In Progress, In Review, Completed | Move project / open detail |
| Pipeline | Deal stage Kanban + forecasting summary | Add opportunity / change stage |
| Tasks | Table + task detail, owners, due dates, status | Add / update / complete task |
| Emails | Folders, list, reader, compose; client/project filters | Compose / reply |
| Templates | Searchable template library and live preview | Create email template |
| Invoices | KPI cards, invoice table, detail preview | New / issue / record payment |
| View invoice | CRM detail view (not a document-only viewer), items, payment history, activity | Send / PDF / record payment |
| Reports | Period selectors, operational/financial metrics | Export permitted report |
| Settings | Workspace details, team, email, services, preferences | Save configuration |

## 6. Required end-to-end user journeys

1. Prospect enters pipeline -> qualified -> proposal -> Won -> explicitly create linked client/project without retyping common data.
2. New client -> add contacts -> create project -> assign tasks -> move through work stages -> send progress email from the project.
3. Receive Titan email -> sync -> match to client -> optionally link to project -> reply -> see full thread on client profile.
4. Project approved -> create invoice with service lines -> issue -> email -> record payment -> update balance/report.
5. User changes dark/light mode -> preference persists without flash or layout movement.

## 7. Business rules

- A contact belongs to one client; an organization can have many contacts.
- A project belongs to one client; an opportunity can become a project via an explicit conversion action.
- Won and Lost are terminal pipeline stages, but an authorized manager can reopen with an audit event.
- Project completion is not inferred only from percentage; changing status and marking tasks complete follow explicit rules.
- An invoice ID is assigned under one atomic transaction, and an issued invoice should be versioned/adjusted, not silently rewritten.
- Invoice balances derive from issued totals minus recorded payments; one invoice may have several payments.
- Email sending requires a confirmed, authorized mailbox; mail visibility is permissioned, not globally public.
- All analytics must distinguish open pipeline from won deals and invoice totals from cash received.
- All production list screens require empty, loading, success, error and permission-denied states.

## 8. Non-functional requirements (user-facing)

- **Responsiveness:** functional at desktop and tablet widths; core actions usable on mobile without pretending five-column Kanban fits a narrow screen.
- **Accessibility:** WCAG 2.2 AA as a delivery target; keyboard navigation, visible focus, reduced-motion support and screen-reader labels.
- **Performance:** immediate visual feedback, progressive loading and cached navigation; measurable targets in the TRD.
- **Coherence:** single reusable component system and one canonical record per entity.
- **Visual law:** cards, inputs, buttons, badges, modals, popovers and navigation **must have 0px radius**.
- **Trust:** no false 'sent'/'paid'/'saved' confirmations; show pending/failure when an operation has not completed.

## 9. Launch acceptance

Launch requires all P0 requirements signed off by feature-owner review, end-to-end tests for key journeys, a tested Titan connection, finance reconciliation tests, security permission tests, at least one tested restore, and validated both-theme visual QA. Full sign-off matrix is in [09 - QA](09_QA_AND_UAT_PLAN.md).

## 10. Dependencies and decisions

The owner must confirm the official application label, number of team seats and mailboxes, who can see which mailbox messages, invoice/tax rules, production domain, data-retention policy and whether any external client portal is intended. See [14 - Decisions](14_DECISION_LOG_AND_ACCEPTANCE.md).
