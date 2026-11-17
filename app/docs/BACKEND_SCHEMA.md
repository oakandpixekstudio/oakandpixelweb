# Oak & Pixel Workspace — Future Backend Schema

Status: planning documentation only. No database, API, authentication, mail, payment, or storage implementation is included in the frontend phase.

This proposal aligns the frontend models with the approved product specifications in `docs/specs/`. Requirements are approved where explicitly stated in those specifications; table names, exact data types, indexes, and constraint implementations below remain proposed technical decisions until backend review.

## Conventions

- PostgreSQL-style types are used for clarity: `uuid`, `text`, `boolean`, `date`, `timestamptz`, `numeric(14,2)`, and `jsonb`.
- Every workspace-owned table includes `organisation_id`, `created_at`, `updated_at`, and an optimistic-lock `version` where concurrent edits matter.
- Mutable business records use `archived_at` rather than destructive deletion.
- Currency values use exact decimals and an ISO currency code. Issued invoice values are immutable snapshots.
- Production access must be enforced server-side and with reviewed row-level policies. Frontend role checks are never authorization.

## Identity and access

| Entity | Purpose and principal fields | Keys, constraints, indexes, and access |
| --- | --- | --- |
| `organisations` | Workspace boundary: `id uuid`, `name text`, `legal_name`, registration/VAT details, timezone, contact/address fields, brand settings `jsonb` | PK `id`; unique normalized name where appropriate; organisation owners/admins only for sensitive updates |
| `users` | Invited staff identity: `id uuid`, `email`, `display_name`, avatar, status, last sign-in | PK `id`; unique normalized email; inactive users denied; personal preferences separated |
| `organisation_users` | Membership: `organisation_id`, `user_id`, title, status, joined_at | Composite unique membership; index `(organisation_id,status)`; invite-only |
| `roles` | Named workspace roles such as Owner, Manager, Contributor, Finance | PK `id`; unique `(organisation_id,name)`; protected system roles cannot be silently deleted |
| `permissions` | Atomic capabilities such as `invoice.read`, `mail.compose`, `team.manage` | PK `id`; unique permission key; centrally defined |
| `role_permissions` | Many-to-many role capability mapping | Composite PK `(role_id,permission_id)`; admin-only updates with audit event |
| `user_roles` | User role assignment per organisation | Composite unique `(organisation_id,user_id,role_id)`; prevents cross-workspace assignment |
| `user_preferences` | Theme, sidebar, density, timezone override | PK/unique `(organisation_id,user_id)`; readable/writable only by the user and authorized support |

## Clients and relationships

| Entity | Purpose and principal fields | Keys, constraints, indexes, and access |
| --- | --- | --- |
| `clients` | Canonical client organisation: `id`, `organisation_id`, name, normalized name/domain, industry, status, service tier, owner_id, address, notes | PK `id`; indexes `(organisation_id,status,updated_at)` and normalized domain; archive instead of delete; duplicate review on name/domain |
| `client_contacts` | Named people: `client_id`, first/last name, job title, normalized email, phone, `is_primary` | PK `id`; FK client cascade/archive policy; partial unique primary-contact index per active client; client-scoped access |
| `client_notes` | Internal notes: `client_id`, body, author_id, visibility, edited_at | PK `id`; index `(client_id,created_at desc)`; permissioned, audit edits |
| `files` | Private file metadata: owner entity/type, storage key, name, MIME, bytes, checksum, scan state | PK `id`; unique storage key; index `(organisation_id,entity_type,entity_id)`; signed access only after scan |

## Delivery

| Entity | Purpose and principal fields | Keys, constraints, indexes, and access |
| --- | --- | --- |
| `project_stages` | Configurable ordered delivery stages | PK `id`; unique `(organisation_id,name)` and `(organisation_id,sort_order)` |
| `projects` | Client delivery record: `client_id`, name, service, stage_id, owner_id, description, start/due dates, progress | PK `id`; FK client/stage/owner; progress check `0..100`; indexes `(client_id,stage_id)` and `(organisation_id,due_date)` |
| `project_members` | Project-to-user assignments with project role | Composite PK `(project_id,user_id)`; contributors limited to assigned projects where policy requires |
| `tasks` | Work item: project_id, title, description, status, priority, assignee_id, due date, progress, sort rank | PK `id`; checks for known status/priority and progress; indexes `(project_id,status,sort_rank)` and `(assignee_id,due_date)` |
| `task_comments` | Task discussion: task_id, author_id, body, edited_at | PK `id`; index `(task_id,created_at)`; edit history or audit event required |
| `task_subtasks` | Ordered checklist items: task_id, label, completed_at, completed_by | PK `id`; index `(task_id,position)` |

## Sales pipeline

| Entity | Purpose and principal fields | Keys, constraints, indexes, and access |
| --- | --- | --- |
| `pipeline_stages` | Ordered stages including Lead, Qualified, Proposal, Negotiation, Won, Lost; probability | PK `id`; unique organisation/name/order; probability check `0..100` |
| `opportunities` | Prospect/deal: optional client_id, name, service, stage_id, value, currency, owner_id, expected close, source | PK `id`; non-negative value; indexes `(organisation_id,stage_id,expected_close)` and owner; Won/Lost transitions audited |
| `opportunity_stage_events` | Immutable stage history and reopen reasons | PK `id`; FK opportunity, from/to stage, actor, timestamp; append-only ordinary access |

## Email and templates

| Entity | Purpose and principal fields | Keys, constraints, indexes, and access |
| --- | --- | --- |
| `email_accounts` | Server-side Titan mailbox configuration metadata; encrypted secret reference, address, status, sync timestamps | PK `id`; unique `(organisation_id,email)`; never return secrets; explicit mailbox grants |
| `email_folders` | Provider folder mapping and cursor data | PK `id`; unique provider folder identity per account; account-scoped |
| `email_threads` | Conversation grouping with last_message_at | PK `id`; index `(email_account_id,last_message_at desc)`; thread by headers, not subject alone |
| `email_messages` | Message metadata/body: thread/account/folder, provider UID, message headers, direction, sender, subject, safe bodies, timestamps, state | PK `id`; unique provider cursor tuple and client send idempotency key; index received/sent time; sanitized HTML only |
| `email_recipients` | To/CC/BCC addresses per message | PK `id`; FK message; recipient-kind check; BCC visibility restricted |
| `email_attachments` | Attachment metadata linked to private file record | PK `id`; FK message/file; size/type constraints; quarantine until scanned |
| `email_links` | Explicit client/project association with source and confirmer | PK `id`; validate project belongs to client; index client/project/thread |
| `email_templates` | Reusable template identity, category, active state | PK `id`; unique organisation/name among active records; soft archive |
| `email_template_versions` | Immutable subject, HTML/text bodies and variable schema per version | PK `id`; unique `(template_id,version_no)`; records exact sent template |

## Billing

| Entity | Purpose and principal fields | Keys, constraints, indexes, and access |
| --- | --- | --- |
| `invoices` | Draft/issued invoice header: client/project, number, status, dates, currency, subtotal, tax, total, revision | PK `id`; unique `(organisation_id,invoice_number)`; totals calculated server-side; issued revision immutable; finance permission |
| `invoice_items` | Snapshot line items: description, quantity, unit price, tax rate, subtotal/tax/total, position | PK `id`; FK invoice; positive quantity/non-negative money; unique invoice/position |
| `payments` | Manually recorded receipts: invoice_id, amount, currency, received_at, reference, method, recorder, voided_at | PK `id`; positive amount; duplicate reference review; reversal rather than deletion |
| `invoice_events` | Issue, send, payment, correction, void activity | PK `id`; index `(invoice_id,created_at)`; append-only |

## Platform operations

| Entity | Purpose and principal fields | Keys, constraints, indexes, and access |
| --- | --- | --- |
| `notifications` | User-facing event: recipient, type, entity reference, title/body, read_at | PK `id`; index `(recipient_id,read_at,created_at desc)`; recipient-only reads |
| `activity_logs` | Product timeline events safe for workspace display | PK `id`; organisation/entity indexes; redacted metadata |
| `audit_logs` | Security/compliance record: actor, action, entity, request ID, before/after redacted data, IP/user-agent metadata | PK `id`; append-only; restricted export; retention formally approved |
| `application_settings` | Organisation-scoped stage defaults, invoice preferences, feature settings | Unique `(organisation_id,key)`; validated schema per key; admin-only writes |
| `mail_send_jobs` | Idempotent outbound/scheduled mail job state | PK `id`; unique client message key; attempts/status/error; reconcile ambiguous SMTP outcomes before retry |
| `mail_sync_jobs` | Mail sync cursor, folder, status and failure classification | PK `id`; one active job per mailbox/folder when locked; operational access only |

## Relationship summary

- Organisation → users, clients, pipeline/project stages, mailboxes, templates, settings.
- Client → contacts, projects, opportunities, linked messages, invoices, notes, files.
- Project → members, tasks, linked messages, invoice records, files.
- Email account → folders → messages → recipients and attachments; messages group into threads and link explicitly to client/project.
- Invoice → immutable line-item snapshots → zero or more payments and append-only events.

## Access and privacy considerations

Production design must provide organisation isolation, role/permission checks, project membership controls, explicit mailbox grants, finance scopes, private signed file URLs, malware scanning, safe email HTML, rate limits, audit coverage, and POPIA-reviewed retention/export/deletion workflows. Service credentials remain encrypted server-side and never appear in browser bundles or activity metadata.

## Deliberately excluded from this phase

No SQL migrations, live database tables, Supabase client, RLS policies, API routes, server actions, authentication provider, Titan connector, payment service, background worker, storage bucket, or production data is created by this frontend implementation.
