# Development Backlog and User Stories

**Version:** 1.0 working specification  
**Date:** 17 November 2026  
**Status:** Proposed execution backlog. No story is authorized to expand approved V1 scope.

## 1. How to use this backlog

Stories are grouped into delivery epics and ordered by dependency. Each story refers to PRD functional requirements and must meet the cross-cutting definition of done in file 11. Engineering can split stories further, but must not replace business acceptance with a purely visual mockup.

## 2. Epic A - Workspace foundation, sign-in and design system

| Story | User story | Acceptance condition | PRD |
| --- | --- | --- | --- |
| US-001 | As an invited employee, I can sign in securely so I can access my workspace. | Valid invite + sign-in works; uninvited user denied; reset flow safe. | FR-001 |
| US-002 | As an admin, I can invite, suspend and assign staff roles. | Permission matrix enforced server-side; suspended user immediately loses effective access. | FR-001, FR-016 |
| US-003 | As a user, I can toggle and persist dark/light mode. | No theme flash; all routes share same design tokens; preference persists. | FR-018 |
| US-004 | As a user, I can navigate without the shell resetting. | Sidebar/search/header remain stable; route transitions and breadcrumbs accessible. | FR-018 |
| US-005 | As a designer/engineer, I can rely on a strict 0px-radius component system. | Computed style audit finds no curved corners in UI controls/containers across themes. | FR-018 |

## 3. Epic B - Clients and contacts

| Story | User story | Acceptance condition | PRD |
| --- | --- | --- | --- |
| US-006 | As a manager, I can add a client with relevant business details. | Required fields validated; duplicate warning; record appears in list and timeline. | FR-003 |
| US-007 | As a manager, I can add several contacts and mark one primary contact. | At most one active primary per client; email format validated. | FR-005 |
| US-008 | As a team member, I can find a client quickly using search/filter. | Paginated and permission-filtered results; empty/no-match states shown. | FR-003 |
| US-009 | As a manager, I can open a complete client profile. | Correct projects, contacts, permitted mail, invoices and notes link to same client ID. | FR-004 |
| US-010 | As an admin, I can archive a client without corrupting historic records. | Archive hides from active filters; existing invoices/audit retained under policy. | FR-003, FR-017 |

## 4. Epic C - Opportunities and project delivery

| Story | User story | Acceptance condition | PRD |
| --- | --- | --- | --- |
| US-011 | As a sales manager, I can create and qualify a deal in the pipeline. | Stages, owner, service, amount and expected close recorded; activity logged. | FR-009 |
| US-012 | As a sales manager, I can move a deal through stages. | Open/Won/Lost metrics update accurately; stage history preserved. | FR-009, FR-015 |
| US-013 | As a manager, I can convert a Won deal to a client project. | Linked project created once; no automatic invoice; no duplicate client. | FR-009, FR-006 |
| US-014 | As a manager, I can create and edit a project with delivery dates and owner. | Client/service association and editable status valid; permissions enforced. | FR-006 |
| US-015 | As a manager, I can move project cards across Kanban stages. | Drag and keyboard move work; optimistic status rollback on rejected save. | FR-007 |
| US-016 | As a contributor, I can view and update tasks assigned to me. | Task status, priority and due date show correctly; unrelated records denied. | FR-008 |
| US-017 | As a manager, I can see delivery activity and next actions. | Client, project, task and dashboard views reflect committed changes. | FR-002, FR-017 |

## 5. Epic D - Titan communications and templates

| Story | User story | Acceptance condition | PRD |
| --- | --- | --- | --- |
| US-018 | As an admin, I can connect and test my GoDaddy Titan mailbox. | IMAP and SMTP tested independently; secure secret handling; actionable errors. | FR-010 |
| US-019 | As a granted user, I can browse my permitted inbox and messages. | Bounded initial sync, incremental sync and no cross-mailbox leak. | FR-011 |
| US-020 | As a granted user, I can reply/send with attachments. | Correct sender, threading, sanitized content, safe attachments, durable job status. | FR-011 |
| US-021 | As a user, I can see whether mail actually sent. | SMTP accepted vs unknown/failed clearly distinguished; duplicates avoided. | FR-011 |
| US-022 | As an account manager, I can link a conversation to a client/project. | Ambiguous links require manual choice; client view enforces mailbox grants. | FR-012 |
| US-023 | As a user, I can apply a branded email template. | Preview substitutions safe; missing variables reported; template version retained. | FR-013 |
| US-024 | As an admin, I can revoke mailbox connection/access. | Worker stops and reads/sends denied according to approved data retention policy. | FR-010, FR-017 |

## 6. Epic E - Invoicing and reporting

| Story | User story | Acceptance condition | PRD |
| --- | --- | --- | --- |
| US-025 | As a finance user, I can create a draft invoice from client/project context. | Decimal totals computed server-side; tax settings approved; no client re-entry. | FR-014 |
| US-026 | As a finance user, I can issue, view and download an invoice. | Number unique, issued revision preserved, CRM detail view usable, PDF secondary. | FR-014 |
| US-027 | As a finance user, I can send an invoice through a permitted mailbox. | Real send status recorded and visible on invoice activity. | FR-014, FR-011 |
| US-028 | As a finance user, I can record partial/full payments. | Outstanding balance and status reconcile; duplicate entry warned; audit preserved. | FR-014 |
| US-029 | As an owner, I can review sales, delivery and finance reports. | Metrics defined in file 12 reconcile with source records across pages. | FR-002, FR-015 |

## 7. Epic F - Quality and release

| Story | User story | Acceptance condition | PRD |
| --- | --- | --- | --- |
| US-030 | As an owner, I can trust that unauthorized staff cannot inspect private client/mail/finance data. | RBAC/RLS and negative API tests pass. | FR-001, FR-017 |
| US-031 | As a user, I can distinguish loading, error, empty and saving states. | Every principal route has useful states, zero-radius skeletons, safe retry. | FR-018 |
| US-032 | As an operator, I can detect and recover from sync/worker/deploy failure. | Alerts, retries, backups, tested restore and runbook exist. | FR-010, FR-017 |
| US-033 | As an owner, I can approve release with evidence. | Critical UAT, performance, security, theme and Titan live tests signed off. | All P0 |

## 8. Stories explicitly postponed from P0

Scheduled email sending, reusable generated contract/proposal documents, CSV import/export, advanced mailbox archive/delete sync, custom automation, self-service client portal, online payment gateway, and native mobile app. Do not imply these are complete in a production UI until implemented and accepted.

## 9. Shared story completion checklist

- [ ] Business rule and accepted workflow match PRD.
- [ ] Data model, API and RLS rules exist and are migrated.
- [ ] Relevant audit and history records are written once.
- [ ] Desktop/tablet responsive layout, accessible keyboard path and both themes work.
- [ ] **No rounded cards, buttons, inputs, badges, controls or containers.**
- [ ] Loading, empty, error, optimistic rollback and permission-denied states work.
- [ ] Unit, integration or e2e tests match story risk.
- [ ] No actual private client email or secrets appear in tests, screenshots or logs.
