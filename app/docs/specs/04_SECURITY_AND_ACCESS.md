# Security and Access Control Specification

**Version:** 1.0 working specification  
**Date:** 17 November 2026  
**Security posture:** Least privilege and defense in depth; model controls on OWASP ASVS Level 2 where proportionate.

## 1. Identity model

- Authentication via Supabase Auth, **invite-only**.
- No public signup in V1, no social login requirement, no external client sessions.
- MFA required for Owner/Admin and Finance; strongly recommended for all staff.
- Restrict password resets and email changes with secure challenge flows.
- Refresh/access token management must follow Supabase's current SSR session guidance; no localStorage token shortcuts.
- Re-check active membership on privileged server calls. Suspension/revocation must invalidate effective privileges quickly, even if a session token remains temporarily valid.

## 2. Roles (proposed default matrix)

`R` read, `W` create/change, `A` administrative control, `-` denied, `S` assigned records only, `P` permissioned mailbox only. These are defaults requiring owner approval.

| Capability | Owner/Admin | Manager | Contributor | Finance |
| --- | --- | --- | --- | --- |
| Organization settings and users | A | - | - | - |
| Clients and contacts | R/W | R/W | S/R | R |
| Projects and tasks | R/W | R/W | S/R/W | R |
| Opportunities/pipeline | R/W | R/W | - | R |
| Email send/read | P/R/W + grant | P/R/W + grant | P/R/W + grant | P only by grant |
| Email mailbox connection | A | - | - | - |
| Email templates | R/W | R/W | R/use | R/use if granted |
| Invoices and payments | R/W | R | - | R/W |
| Reports | R/W | R (non-sensitive by policy) | S | R financial |
| Export/download bulk records | A | Per explicit grant | - | Finance only |
| Audit logs | A | - | - | - |

**Critical exception:** Admin status should not silently expose private mailbox messages. The admin can configure access, but content access requires a separate authorized grant, logged for sensitive elevated access.

## 3. Authorization and storage boundaries

- Every protected table has RLS enabled and verified policies for workspace membership and role/scope; deny-by-default.
- Never use an unrestricted `service_role` client in the browser. Server jobs with a privileged secret must themselves enforce workspace/actor scope.
- All API endpoints enforce RBAC and record-level checks before data access or mutation. Do not depend on hidden UI buttons.
- Uploaded project/client/email files are private; serve with short-lived, authorized signed URLs or an authenticated streaming route.
- Access to one client must not imply access to every email in that client's company domain. Link/visibility are separate decisions.
- Log denied access attempts at appropriate rate limits without recording sensitive payloads.

## 4. Mailbox credentials and secrets

- Only a server-side admin connection flow accepts mailbox credentials. Never send the mailbox password to another user's browser.
- Prefer Titan application passwords where available; verify availability for the specific GoDaddy account. Do not mandate a capability that the account may not offer.
- Encrypt credentials at rest with authenticated encryption and a key managed separately from database content. Strictly limit decrypt permission to connector code and secret-rotation functions.
- Do not log credentials, raw MIME passwords, authorization headers, message contents or API keys.
- Disconnect must revoke internal access immediately and provide instructions to revoke the Titan app password in webmail.
- Rotate keys and credentials on compromise; test recovery from expired/changed passwords.

## 5. Security controls checklist

| Threat | Required control |
| --- | --- |
| Unauthorized record access / IDOR | Server authorization + RLS + negative permission tests |
| CSRF / forged actions | SameSite cookies, CSRF protections where appropriate, origin/host checks |
| XSS from email HTML | Robust HTML sanitization; sandbox rendering; disable remote images by default; safe link handling |
| SSRF / unsafe preview | Do not fetch arbitrary user-supplied URLs from private networks; allowlist integrations |
| Malicious files | Type and size validation, MIME sniffing, malware scan/quarantine, content-disposition download |
| Credential stuffing | Rate limits, lockout/backoff, MFA, suspicious sign-in alerts |
| Tenant/role escalation | Workspace-scoped queries, tested roles, no client-controlled role claims |
| Duplicate emails | Send idempotency, ambiguous SMTP-result reconciliation, audit records |
| Finance tampering | Invoice versioning, server-side totals, payment ledger, privileged adjustments |
| Data leakage via logs | PII redaction and narrow telemetry events |
| Export abuse | Role checks, query limits, export audit, optional confirmation for large exports |

## 6. Audit event minimum

Store actor ID, workspace, action, entity type/ID, timestamp UTC, prior/new value summary when safe, request correlation ID, origin (user/job) and decision result. Audit: role changes, invitations, mailbox link/unlink, bulk export, pipeline stage changes, invoice issue/void/payment, client deletion and security events. Audit logs are append-only to ordinary staff and have a defined retention policy.

## 7. Account recovery, suspension and device control

- Owner/Admin can suspend a user; active sessions must lose access at next authorized server check.
- Owner/Admin cannot read or reset a user's password; use trusted reset/invite flows.
- Security-critical changes should require MFA step-up or recent authentication.
- A lost device response must include revoke sessions, revoke mailbox access where relevant, rotate secrets if exposed, and check access logs.

## 8. Security validation gates

Perform automated dependency scanning, static checks, API permission tests, RLS policy tests, authenticated/unauthenticated route tests, upload sanitization tests, email HTML XSS tests, and documented restore testing. Commission a focused security review before handling substantial real client data.

## 9. Incident response summary

**Detect -> Contain -> Preserve evidence -> Assess exposure -> Notify required parties -> Recover -> Learn.** Disable compromised credentials and relevant jobs; keep customer data out of incident chats/tickets unless authorized; involve the designated Information Officer for POPIA obligations. See file 13 for legal notification responsibilities and data-governance controls.
