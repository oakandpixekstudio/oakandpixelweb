# GoDaddy Titan Email and Communications Integration

**Version:** 1.0 working specification  
**Date:** 17 November 2026  
**Confirmed provider:** GoDaddy Professional Email powered by Titan  
**Not required:** Microsoft 365 or Microsoft Graph.

## 1. Purpose

The Oak & Pixel Emails page should be a reliable, connected business mailbox with compose, reply, conversation history and client/project linkage. We will integrate the existing GoDaddy/Titan email service rather than run our own mail server or require a new Microsoft account.

## 2. Verified default connection parameters

| Purpose | Value | Notes |
| --- | --- | --- |
| Incoming protocol | IMAP over TLS | IMAP server access; verify third-party access enabled |
| Incoming hostname | `imap.secureserver.net` | GoDaddy-specific Titan settings |
| Incoming port | `993` | SSL/TLS |
| Outgoing protocol | SMTP over TLS | Authenticated submission |
| Outgoing hostname | `smtpout.secureserver.net` | GoDaddy-specific Titan settings |
| Outgoing port | `465` | SSL/TLS; some other vendor guides mention 587, but V1 default is 465 |
| Username | Full mailbox email address | Account-specific |
| Password | Mailbox password or provider-supported app password | App password preferred when supported with Titan 2FA |

**Sources:** [GoDaddy IMAP guide](https://se.godaddy.com/help/use-imap-settings-to-add-my-professional-email-powered-by-titan-to-a-client-32204?lc=en-US), [GoDaddy SMTP guide](https://www.godaddy.com/help/set-up-third-party-plugins-or-websites-using-smtp-settings-42788), [Titan application password guide](https://support.titan.email/hc/en-us/articles/59899461438233-Application-Password-in-Titan-for-Third-Party-Clients). These are defaults to validate on the **specific account**; features and limits may vary by plan/settings.

## 3. Connection onboarding

1. Admin chooses `Settings -> Email & integrations -> Connect Titan`.
2. Screen explains required mailbox address, third-party access and credential type. It does not ask users to disable 2FA.
3. Admin enters credentials into a secure, short-lived server endpoint; credentials are sealed with separate managed encryption and are not returned in any API response.
4. Test IMAP authentication and folder listing; test SMTP authentication/safe send using an authorized test recipient.
5. Record a sanitized connection outcome: incoming works, outgoing works, or precise recoverable failure.
6. Map Inbox, Sent, Drafts, Trash and Archive by provider folder inspection, not hard-coded names.
7. Begin bounded initial synchronization and show the last sync timestamp and status.
8. Confirm user-to-mailbox access grants.

**Never ship a `Connected` badge based only on successful IMAP login if SMTP sending is broken.**

## 4. Sync strategy

### Initial sync

Proposed default: latest 90 days or latest 1,000 messages per mailbox, whichever is reached first. Make the window configurable for authorized admins. Pull folder metadata and message metadata first; fetch full bodies/attachments selectively to minimize storage and network usage.

### Incremental sync

- Poll from durable background jobs with sensible backoff; initial proposed cadence 2-5 minutes, subject to provider restrictions and operating costs.
- Track each folder's UIDVALIDITY, highest UID and last successful synchronization; avoid treating UIDs as globally unique.
- Rebuild cursor state safely when UIDVALIDITY changes; deduplicate by provider identity and message headers.
- Reconcile moves between folders without multiplying visible conversations.
- Never assume IDLE, webhooks, CONDSTORE or QRESYNC are supported until tested.
- Surface `Last synced`, `Syncing`, `Delayed`, `Action required` states to authorized staff.

### Failures

Classify authentication failures separately from network timeout, rate limit, malformed message and unknown server response. Use capped exponential backoff with jitter and operational alerts. Stop repeated bad-password attempts; require admin intervention. Track partial progress so a single corrupt message does not block entire inbox.

## 5. Compose, send and Sent synchronization

- Composer supports To, CC, BCC, subject, rich text + text alternative, approved attachments and template insertion.
- Validate sender permission, recipients, attachment scan results and message size before enqueuing.
- Persist send intent with unique idempotency key before SMTP call; show `Queued` -> `Sending` -> `SMTP accepted` or failure.
- SMTP success means the server accepted the message for processing, **not guaranteed recipient delivery or open/read**.
- Some SMTP providers do not automatically save a copy into the Sent folder. After SMTP acceptance, verify whether Titan saved it; if not, attempt a safe IMAP `APPEND` copy to the mapped Sent folder where supported.
- Avoid duplicate Sent copies by reconciling Message-ID, mailbox/folder identity and the send job record.
- If SMTP times out after possibly accepting mail, mark `Needs attention` and reconcile; do **not blindly retry** and risk duplicate client emails.
- Log only sanitized provider status and correlation IDs, never message bodies or credentials.

## 6. Conversation threading

Use `Message-ID`, `In-Reply-To` and `References` headers to group related messages; fall back cautiously when headers are absent. Subject similarity alone is insufficient. Replies must preserve headers and sender identity. Represent inbound and outbound messages consistently regardless of the folder in which they were first discovered.

## 7. Client/project association

- Try exact normalized email matching against known contacts.
- A unique match may create a suggested client association. Automatically committing a link is a privacy/ownership decision requiring owner approval.
- When two contacts match or a thread has multiple clients, ask the user to select the correct client; never guess from company domain alone.
- Project association is optional and explicit or strongly confirmed; a message linked to a project appears on the client's Communication tab subject to mailbox permissions.
- Client record access **does not** override a mailbox-content restriction.
- Users can unlink/reassign a message with an audit event.

## 8. Templates and automated communication

V1 templates: onboarding welcome, project kick-off, content request, project update, approval request, milestone review, invoice reminder and handover. Store versions and a whitelist of substitutions:

`{{client_name}}`, `{{contact_first_name}}`, `{{project_name}}`, `{{project_status}}`, `{{due_date}}`, `{{invoice_number}}`, `{{invoice_balance}}`.

Unknown template variables must block preview/send with a helpful explanation; do not insert raw unsanitized HTML variables. Scheduled emails require an explicit enqueue time and cancel option. Do not use the Titan mailbox as a mass-marketing service; respect provider acceptable-use and volume limits.

## 9. UI states

- Mail list: Inbox, Sent, Drafts, Starred (local/provider-supported), Archive/Trash only after actual semantics are validated.
- Reader: safely sanitized HTML, optional plain text, external image blocking, attachment metadata and explicit downloads.
- Composer: save draft, select mailbox, confirm recipients, send/schedule, inline error with retry.
- Filters: date, client, project, unread, mailbox and search; never expose unauthorized mail through result counts/snippets.
- Empty screen: connection/setup guidance, not a generic error.

## 10. Security and compliance

Use mailbox-level grants; encryption at rest for credentials; private attachment storage; short-lived file URLs; malware scanning; message HTML sanitization; retention settings; data export and deletion controls where legally permissible. Review POPIA processing bases, processor contracts and cross-border hosting in file 13.

## 11. Live-account acceptance tests

| Test | Expected result |
| --- | --- |
| Correct GoDaddy Titan account credentials | IMAP and SMTP independently pass |
| Invalid credentials | Clear error; no endless retries or secret leakage |
| Titan 2FA/app password enabled | Connection works with supported app password where available |
| New inbound message | Appears once and sync timestamp updates |
| Reply and forward | Correct sender/recipients, threading headers preserved |
| SMTP accepted / Sent folder | Exactly one visible sent message after reconciliation |
| SMTP uncertain result | `Needs attention` state; no automatic duplicate email |
| Attachment with unsafe MIME | Quarantined or refused; never executed |
| Private mailbox / ungranted user | Denied by server and hidden from search/report results |
| Disconnect + credential revocation | Worker stops; account marked disconnected; existing data treated per approved retention policy |

## 12. Unverified items / configuration decisions

Verify actual Titan account plan, mailbox count, quota and sending limits; supported IMAP flags and folder semantics; attachment/message size limits; app password availability; and whether automated sending is allowed by the provider's current terms. These must be tested, not inferred from generic SMTP compatibility.
