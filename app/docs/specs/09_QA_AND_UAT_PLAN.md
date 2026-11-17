# Quality Assurance and User Acceptance Testing Plan

**Version:** 1.0 working specification  
**Date:** 17 November 2026  
**Release approach:** P0 requirements are testable and blocking; P1 is not misrepresented as working.

## 1. Test layers

- **Unit tests:** business rules, money/rounding, status transitions, validation, metric definitions, template substitution, permission predicates.
- **Integration tests:** database constraints/RLS, server authorization, email adapter against a controlled IMAP/SMTP test server, queue/idempotency, private file access.
- **E2E tests (Playwright):** sign-in, create client, convert deal, create project/task, send message, issue invoice, record payment, toggle theme.
- **Accessibility checks:** automated axe-style testing plus keyboard and screen-reader spot checks.
- **Visual regression:** desktop and tablet screenshots in dark/light themes and zero-radius computed styles.
- **Controlled live integration:** GoDaddy Titan test mailbox and authorized recipient, with full monitoring of send/sync behavior.
- **Security checks:** auth bypass, IDOR, privilege escalation, unsafe HTML/file handling, excessive request rates, leak prevention.

## 2. Critical UAT cases

| ID | Flow / risk | Expected outcome | PRD mapping |
| --- | --- | --- | --- |
| UAT-001 | Uninvited user opens client route | Redirect/deny; no client data in response | FR-001 |
| UAT-002 | User signs in and switches theme | Correct theme persists after refresh; no theme flash | FR-001, FR-018 |
| UAT-003 | Add client and primary contact | Searchable record; single primary per client; timeline event | FR-003 to FR-005 |
| UAT-004 | Duplicate-looking client name | Non-blocking duplicate review, no accidental merge | FR-003 |
| UAT-005 | Create project + assign tasks | Project and tasks show correct owners/status/dates | FR-006, FR-008 |
| UAT-006 | Drag Kanban card | Smooth UI, persisted status and order, correct activity entry | FR-007 |
| UAT-007 | Kanban update network failure | Card rolls back; visible retry/error; no false save | FR-007 |
| UAT-008 | Move deal to Won | Stage history captured; open pipeline decreases; won metrics update | FR-009, FR-015 |
| UAT-009 | Convert won deal | New project linked; no duplicate client or unintended invoice | FR-009 |
| UAT-010 | Connect Titan | Independent IMAP and SMTP status shown | FR-010 |
| UAT-011 | Receive inbound Titan message | Appears once; correctly permissioned; sync timestamp visible | FR-011, FR-012 |
| UAT-012 | Send client reply | Correct headers, sender mailbox; accepted vs delivery semantics clear | FR-011 |
| UAT-013 | Unknown SMTP outcome | No blind duplicate retry; manual/reconciliation state | FR-011 |
| UAT-014 | Email addressed to multiple clients | No silent wrong-client association; manual correction available | FR-012 |
| UAT-015 | Apply approved email template | Variables safely replaced; missing variables block sending | FR-013 |
| UAT-016 | Draft -> issue invoice | Totals, tax and number server-calculated and snapshotted | FR-014 |
| UAT-017 | Partial then final payment | Correct balance/status, payment history and reports | FR-014, FR-015 |
| UAT-018 | Unauthorized invoice edit/export | Denied even with manually crafted API request | FR-014, FR-017 |
| UAT-019 | Overview vs report reconciliation | Date range and totals agree on shared metric definitions | FR-002, FR-015 |
| UAT-020 | Background job fails | User sees accurate state; job can retry safely | FR-010 to FR-014 |
| UAT-021 | Both themes UI audit | All components exactly zero-radius; clear focus and errors | FR-018 |
| UAT-022 | Suspended user reuses old session | Server denies all protected actions | FR-001, FR-017 |

## 3. Security/RLS negative test cases

- Contributor attempts to read unrelated projects or contacts; denied.
- Finance role attempts mailbox read without grant; denied.
- User with client access tries to read an ungranted email associated with that client; denied.
- Authorized user attempts update with different `workspace_id`; denied.
- Browser alters submitted invoice totals, tax values or payment status; server recomputes/denies.
- HTML email contains script/remote tracking images/unsafe URL; script blocked and remote image off by default.
- Uploaded file contains suspicious executable content and misleading filename extension; quarantine or rejection.
- Deliberately repeated `POST /emails/send` with same idempotency key; no additional SMTP send.
- Non-admin attempts mailbox connect/disconnect or team role changes; denied and logged.

## 4. Visual and UX checklist

- **Hard-edge audit:** query computed `border-radius` across interactives, inputs, cards, toasts, modals, tooltips, dropdowns, avatars, navigation, skeletons and third-party widgets. Any nonzero radius is a bug.
- Light and dark components use the same spacing/grid; text contrast and error colors are readable.
- Sign-in is visually centered, compact and correctly labeled as internal workspace.
- All shell transitions preserve sidebar/search and avoid full-viewport white/black flashing.
- Loading placeholders preserve final dimensions; no layout jump on table or chart load.
- `prefers-reduced-motion` avoids forced movement; drag/drop supports keyboard actions.
- View invoice is in-CRM and is not simply a PDF embed.
- Screen widths: large desktop, laptop, tablet and mobile landscape/portrait; tables handle overflow gracefully.
- Important icon buttons have accessible names and visible keyboard focus.

## 5. Performance test plan

Collect p75 INP, LCP and CLS under realistic data volumes. Seed at least several hundred clients, a few thousand tasks and emails, and multi-page invoices for stress testing. Test first load and warm navigation separately. Throttle connection and CPU to expose slow skeleton, over-render and excessive hydration. Monitor email sync during foreground use; UI must remain responsive.

## 6. Data and environments

Staging uses synthetic agency records and an isolated or approved Titan test account. Never use live client messages for automated tests. Fixture names must not be mistaken for real clients. Test production migrations against a restored staging copy with anonymized data where applicable.

## 7. Defect severity and release gate

- **Blocker:** data leakage, payment/invoice arithmetic corruption, duplicated sends, broken authorization, data loss, unusable sign-in.
- **High:** broken client/project workflow, hidden email failures, nonfunctional theme/accessibility across primary flows.
- **Medium:** visual mismatch, occasional avoidable navigation lag, weak empty states.
- **Low:** nonessential aesthetic refinement with no usability impact.

Launch conditions: no blockers/high defects; P0 UAT cases pass; Titan live-mail tests pass; security checklist signed off; both themes visually approved; staging deployment and restore drill complete; owner accepts any documented medium/low issues.
