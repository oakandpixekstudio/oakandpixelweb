# API Contracts and Integration Specification

**Version:** 1.0 working specification  
**Date:** 17 November 2026  
**Pattern:** Typed application endpoints and server actions; stable domain contracts.

## 1. API principles

- Browser communicates with Oak & Pixel server endpoints; never with raw Titan credentials.
- All endpoints enforce verified session, workspace scope, role, resource permission and Zod-style input validation.
- Read endpoints paginate; writes use idempotency keys where an external effect or monetary transaction can occur.
- Record versions/ETags prevent silent overwrites when two people edit the same record.
- Return only permitted fields. Sensitive message content and finance fields are not exposed by default.
- Prefer REST-ish names for cross-team clarity; framework may internally implement mutations via secure server actions.

## 2. Standard response patterns

Successful list:

```json
{
  "data": [{ "id": "uuid", "name": "Example client" }],
  "page": { "nextCursor": null, "hasMore": false }
}
```

Failure:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "This record changed since you opened it.",
    "requestId": "req_example"
  }
}
```

Recommended status handling: `400` malformed input, `401` unauthenticated, `403` unauthorized, `404` not found/not visible, `409` version conflict, `422` valid shape but rejected business rule, `429` throttled, `503` dependency unavailable. Do not leak internal provider responses to clients.

## 3. Proposed endpoint inventory

| Endpoint | Methods | Role/ownership requirement | Notes |
| --- | --- | --- | --- |
| `/api/overview` | GET | Authorized workspace member | Aggregates with period and source labels |
| `/api/clients` | GET, POST | Clients read/create | Cursor paging, duplicate warning |
| `/api/clients/:id` | GET, PATCH | Record-scoped client access | `version` on updates |
| `/api/clients/:id/contacts` | GET, POST | Client contact access | Validate email and primary contact |
| `/api/clients/:id/timeline` | GET | Record-scoped read | Include only authorized communications |
| `/api/opportunities` | GET, POST | Sales access | Filter stage/owner/service |
| `/api/opportunities/:id` | GET, PATCH | Sales access | Stage mutation audited |
| `/api/opportunities/:id/convert` | POST | Manager+ | Explicit conversion to client/project, idempotent |
| `/api/projects` | GET, POST | Project permission | List and Kanban both use same records |
| `/api/projects/:id` | GET, PATCH | Project scope | Stage/order/version validation |
| `/api/projects/:id/tasks` | GET, POST | Project scope | Supports task create/list |
| `/api/tasks/:id` | GET, PATCH | Task access | Status, assignee, due date, sort rank |
| `/api/mailboxes` | GET, POST | Mailbox admin for connect | No credential in reads |
| `/api/mailboxes/:id/test` | POST | Mailbox admin | Avoid excessive login attempts |
| `/api/mailboxes/:id/disconnect` | POST | Mailbox admin | Revoke worker access immediately |
| `/api/emails` | GET | Explicit mailbox grant | Thread/list view by folder/filter |
| `/api/emails/:id` | GET | Explicit mailbox grant | Sanitized body and attachment metadata |
| `/api/emails/:id/link` | POST | Email read + client/project permission | Manual client/project association |
| `/api/emails/send` | POST | Explicit mailbox compose grant | Durable send intent and idempotency |
| `/api/emails/drafts` | GET, POST, PATCH | Mailbox compose grant | Draft creation/updates |
| `/api/email-templates` | GET, POST | Read/create permission | Versioned template definitions |
| `/api/email-templates/:id` | GET, PATCH | Template permission | New version on content revision |
| `/api/invoices` | GET, POST | Finance/invoice permission | Amounts computed server-side |
| `/api/invoices/:id` | GET, PATCH | Invoice permission | Issued records have limited mutable fields |
| `/api/invoices/:id/issue` | POST | Finance | Atomic invoice number + snapshot |
| `/api/invoices/:id/payments` | GET, POST | Finance | Payment ledger + balance recalculation |
| `/api/invoices/:id/send` | POST | Finance + allowed sender mailbox | Tracks send; no silent success |
| `/api/invoices/:id/pdf` | GET | Invoice view permission | Authorized PDF export |
| `/api/reports/:reportKey` | GET | Report-scope permission | Date range, export limits |
| `/api/settings/preferences` | GET, PATCH | Current user | Theme/sidebar preferences |
| `/api/settings/members` | GET, POST, PATCH | Workspace admin | Invite, suspend, roles |

## 4. Important write-contract examples

### Update a Kanban project

```http
PATCH /api/projects/PROJECT_UUID
Content-Type: application/json
```

```json
{
  "stage": "in_progress",
  "sortRank": "0.78125",
  "expectedVersion": 7
}
```

Server validates allowed stage and transitions, checks permissions, writes version 8 and activity in one transaction, then returns canonical state. A conflict returns `409`; the browser restores/reconciles.

### Send email

```http
POST /api/emails/send
Idempotency-Key: 4c6ea62b-9b1d-4f29-b828-example
```

```json
{
  "mailboxId": "uuid",
  "to": ["client@example.com"],
  "cc": [],
  "subject": "Project update",
  "textBody": "Hello, here is the latest update.",
  "htmlBody": "<p>Hello, here is the latest update.</p>",
  "clientId": "uuid",
  "projectId": "uuid",
  "draftVersion": 3
}
```

Response: `202 Accepted` with a `sendJobId` and `status: "queued"`. A later status becomes `smtp_accepted`, `failed`, `needs_attention` or `reconciled_sent`. Do not call an accepted job delivered to the recipient.

### Record payment

```json
{
  "amount": "276000.00",
  "currency": "ZAR",
  "receivedAt": "2026-11-16T10:24:00+02:00",
  "reference": "EFT-CLIENT-001",
  "method": "bank_transfer",
  "expectedInvoiceVersion": 4
}
```

Record payment using decimal arithmetic and authorization; reject negative or unapproved overpayment. Prefer a unique externally sourced reference where possible; manual duplicate warning is required.

## 5. Email provider adapter boundary

```ts
interface MailProvider {
  testConnection(accountRef: string): Promise<ConnectionTest>;
  listFolders(accountRef: string): Promise<MailboxFolder[]>;
  syncFolder(input: SyncRequest): Promise<SyncResult>;
  fetchMessage(input: MessageFetchRequest): Promise<ParsedMessage>;
  sendMessage(input: OutgoingMessage): Promise<SendOutcome>;
  appendSentCopy?(input: SentCopyRequest): Promise<AppendOutcome>;
}
```

This permits adding another provider later without changing CRM records or the Emails UI. Titan V1 uses protocol adapters, **not an assumed Titan REST API**.

## 6. Internal events and jobs

| Event/job | Producer | Consumer | Safety requirement |
| --- | --- | --- | --- |
| `opportunity.stage_changed` | Pipeline service | Activity writer | Idempotent history |
| `project.stage_changed` | Project service | Activity writer / notification | One event per committed change |
| `email.sync_requested` | Scheduler/admin | Mail worker | Mailbox lock and rate limit |
| `email.send_requested` | Compose/invoice service | Mail worker | Unique send key, safe retries |
| `invoice.issued` | Finance service | PDF job / activity | Snapshot immutable revision |
| `payment.recorded` | Finance service | Balance/report update | Atomic, audit event |
| `task.due_soon` | Reminder scheduler | Notification delivery | Deduplicate by task+window |

## 7. Search and privacy requirements

Global search across client/project/contact/subject references must enforce access at query time. Never return email previews from mailboxes the user cannot read. For speed, index only authorized, normalized metadata; a full-text message-body index is optional and must be reviewed for privacy and retention impact.

## 8. Upload/download boundaries

File upload endpoint returns a short-lived signed upload target after authorization and type/size checks. The worker scans/quarantines until safe. Files download through short-lived signed access or an authorized streaming proxy. Attachment filenames must be sanitized before display and download.

## 9. Integration contract tests

Required: invalid session, wrong role, wrong workspace, version conflict, duplicate idempotency key, IMAP disconnect, SMTP timeout with unknown outcome, PDF permission denial, payment duplicate, oversized attachment, malformed MIME, safe HTML, and consistent pagination. See file 09.
