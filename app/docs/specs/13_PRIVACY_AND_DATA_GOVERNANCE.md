# Privacy, POPIA and Data Governance Plan

**Version:** 1.0 working specification  
**Date:** 17 November 2026  
**Jurisdictional focus:** South Africa  
**Status:** Operational design, **not a substitute for legal advice**.

## 1. Why this is required

The CRM holds personal information about staff and client contacts, emails, attachments and financial correspondence. Security alone is not enough: Oak & Pixel must document why information is collected, who can access it, where it is stored, how long it is retained and how requests/incidents are handled.

South Africa's Protection of Personal Information Act (POPIA) includes safeguards for integrity and confidentiality (sections 19-21), security-compromise notifications (section 22), access/correction rights (sections 23-24), retention (section 14), and cross-border transfers (section 72). See the [official Act](https://inforegulator.org.za/wp-content/uploads/2025/08/PROTECTION-OF-PERSONAL-INFORMATION-ACT-4-OF-2013.pdf) and [Information Regulator security compromise fact sheet](https://inforegulator.org.za/2025/08/19/fact-sheet-handling-of-security-compromises/).

## 2. Data inventory

| Data category | Examples | Reason collected | Sensitivity / access |
| --- | --- | --- | --- |
| Team identity | Staff name, email, role, sign-in activity | Authenticate and authorize internal users | Internal/security admins |
| Client organization | Name, legal/billing data, website, industry | CRM and contracts | Managers and scoped staff |
| Client contacts | Name, email, role, phone | Client project communication | Scoped team; personal information |
| Sales opportunities | Deal value, notes, sales status | Pipeline management | Owner/manager; restricted financial views |
| Project/tasks | Work assignments, notes, milestones | Service delivery | Project members and managers |
| Email communications | Sender/recipients, subject, bodies, attachments | Client correspondence | **Explicit mailbox grants**; potentially confidential |
| Billing | Invoice data, amounts, payment references | Invoice administration | Finance and approved owner |
| Technical logs/audit | IP/session metadata, actor actions, request IDs | Security, traceability | Restricted privileged access |

Do not ingest unnecessary personal identifiers, special personal information or client confidential files by default.

## 3. Accountabilities and lawful processing

- Name an internal **Information Officer** and assign responsibility for retention, incident reporting and privacy requests, subject to legal requirements.
- Document for each category the lawful justification and notice/contract terms used; do not assume universal consent is the only legal basis.
- Publish appropriate privacy notices for the agency and ensure client service agreements cover business contact processing and the role of any suppliers.
- Review data processing terms for Supabase, hosting, job processor, Sentry and any file/email services used.
- Do not send direct marketing via this CRM unless legal requirements, permissions and opt-out controls are assessed separately from ordinary service correspondence.

## 4. Data minimization and access

- Store only what is needed for client management and delivery.
- Prefer email metadata-first sync and selective body/attachment fetching.
- Do not automatically cross-link private mailbox content to all users who can see a client profile.
- Use exact contact matching and manual review for ambiguous email associations.
- Restrict bulk exports and log their purpose, actor and scope.
- Apply redaction to monitoring/error traces so no message bodies or passwords are shipped into telemetry.

## 5. Retention and deletion schedule (requires owner/legal approval)

Do **not** embed unsupported fixed statutory retention deadlines in the software. Create an approved schedule containing, per category: business/legal basis, minimum period if law requires one, normal retention window, archival trigger, deletion procedure, backups schedule and hold exceptions.

Suggested categories to make explicit:

1. Client/contact records after relationship closure.
2. Project documents and revision history after handover.
3. Synced Titan email metadata, message bodies and attachments, including post-disconnect behavior.
4. Quotes/contracts, invoice revisions and payment records.
5. Audit/security events and application error logs.
6. User account data after departure.

**Important:** Do not delete issued financial documents or legally required records just because a client record was archived. Conversely, do not retain entire email inboxes forever merely because incremental sync made it easy.

## 6. Data-subject request workflow

`Request received -> identity and authority verification -> scope personal information -> check exemptions/retention duties -> export/correct/restrict/delete as permitted -> respond and log outcome.`

The CRM should provide administrator tools to search linked records and export authorized records without revealing unrelated staff/client email messages. Escalate complex requests to the Information Officer. Do not promise immediate or unconditional deletion of any data category.

## 7. Security incidents and reporting

On suspected unauthorized access: contain, preserve evidence, assess affected information, involve Information Officer and follow statutory notification obligations. POPIA section 22 addresses notification to the Information Regulator and affected data subjects when the statutory circumstances are met, as soon as reasonably possible, considering relevant exceptions and investigative needs. The Information Regulator's fact sheet notes that breaches should not be dismissed simply as low-risk without proper assessment.

Maintain a written incident log and notification decision trail. Configure secure internal alerts; do not automatically email all clients before the facts and legal requirements have been established.

## 8. Cross-border processing and hosting review

Before selecting production cloud regions, review where Supabase, Vercel, job services, monitoring and storage process personal information and whether relevant transfers meet POPIA section 72 conditions. Document sub-processors, data protection terms, transfer safeguards, support access and backup locations. A South African customer base does **not** by itself mean foreign cloud hosting is forbidden, but it requires documented review.

## 9. Email-specific governance

Titan mailbox access belongs to the actual authorized mailbox owner. App passwords must be rotated/revoked on departure or incident. Define whether staff are permitted to connect shared addresses, which folders may be ingested, who can read content, and what occurs when a contact asks to stop marketing communications. Treat BCC recipients and attachments as sensitive.

## 10. Launch deliverables

- [ ] Appointed Information Officer and escalation contact.
- [ ] Approved data inventory and access matrix.
- [ ] Signed/accepted service-provider processing terms as appropriate.
- [ ] Privacy notice and contact-record processing rationale.
- [ ] Approved retention and backup deletion policy.
- [ ] Incident response checklist and notification decision owner.
- [ ] Cross-border transfer/hosting assessment.
- [ ] Data access/correction/export workflow tested.
- [ ] Staff mailbox usage and client email visibility policy approved.
