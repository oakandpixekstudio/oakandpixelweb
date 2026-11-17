# Deployment, Operations and Recovery Runbook

**Version:** 1.0 working specification  
**Date:** 17 November 2026  
**Owners:** Product owner + engineering/operations

## 1. Environment design

| Environment | Purpose | Key controls |
| --- | --- | --- |
| Local | Development and rapid UI iteration | Synthetic records, mock SMTP/IMAP, local-only secrets |
| Staging | UAT, migration rehearsal, security and performance checks | Separate database, separate storage, restricted test mailbox, preview URL |
| Production | Live Oak & Pixel business operations | Separate secrets, monitoring, backups, controlled deploys |

Never share the same Supabase service secret, mailbox password, storage bucket or job queue between staging and production. External clients must not receive test emails accidentally.

## 2. Deployment topology

- Next.js web on Vercel or equivalent managed web host.
- Supabase project for Postgres, Auth and private file storage.
- Background worker/runtime for Titan sync and scheduled sends; choose a hosting model that supports required networking, job duration and concurrency. Do not rely on a short-lived web request for mailbox polling.
- Inngest or equivalent durable job orchestration.
- Sentry and structured logs, with personal data filtered before emission.
- Domain, DNS, TLS certificate and external sender configuration verified in launch checklist.

## 3. Required configuration (names only; no real secret values)

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
MAILBOX_CREDENTIAL_ENCRYPTION_KEY_REF
JOBS_SIGNING_KEY
SENTRY_DSN
APP_ENV
```

The list is conceptual; use current Supabase naming at implementation and distinguish public keys from server-only secrets. Titan per-mailbox passwords/application passwords belong in a secrets vault or encrypted credential store, **not** ordinary checked-in `.env` files or publicly logged DB rows.

## 4. Continuous delivery checks

1. Type-check and lint.
2. Run unit and integration tests, including permission and finance math.
3. Check dependencies/secrets, run static security scans.
4. Build optimized application.
5. Run isolated migration tests and staging deploy.
6. Run e2e critical-path, visual and accessibility checks.
7. Approve release and deploy using a tagged version.
8. Run post-deploy smoke tests and compare error/performance metrics.

Production database migrations should be forward-compatible; do expand/contract for breaking schema changes. Roll back the application when possible without blindly reversing destructive migrations.

## 5. Backup and disaster-recovery policy

**Proposed internal goals (not vendor guarantees):** RPO <= 24 hours and RTO <= 4 hours for critical CRM data. Validate paid hosting plan supports the actual backup schedule and retention; test full restore in staging before approving these goals.

- Back up Postgres using provider-supported managed backups and periodic independently verifiable exports where appropriate.
- File backup/storage replication follows retention policy; a DB backup alone does not recover attachments.
- Secret and worker configuration recovery procedures must be documented without storing plaintext credentials in backup bundles.
- Test a point-in-time or snapshot restore quarterly; record actual restore time and data gap.
- Maintain pre-migration checkpoint for significant releases.
- External Titan remains the authority for original mail, but don't rely on mail provider history alone to restore CRM client/project associations.

## 6. Monitoring and alerting

| Signal | Alert threshold / owner action |
| --- | --- |
| Authentication failures | Elevated rate -> review brute-force and provider health |
| API/server 5xx | Sustained increase -> investigate deploy/dependency |
| p75 INP/LCP/CLS | Regressions beyond TRD targets -> performance review |
| Titan sync stale | Mailbox exceeds agreed freshness threshold -> worker/provider check |
| SMTP failure/unknown outcomes | Immediate operator queue and no automatic repeated send |
| Job queue backlog | Growing queue age -> scale worker or resolve poison job |
| Database/storage capacity | Proactive warning before quota issues |
| High-volume export / role changes | Security-sensitive audit alert |
| Backup/restore failures | Escalate, block major release until verified |

## 7. Operational playbooks

### Mailbox disconnected / wrong password

1. Mark mailbox `Action required` and stop repetitive login attempts.
2. Notify authorized mailbox administrator, not all staff.
3. Test IMAP and SMTP independently; check GoDaddy/Titan account, 2FA/app-password state and provider status.
4. Reauthorize credentials securely; run bounded catch-up sync.
5. Confirm no gaps, duplicate sends or unauthorized recipient exposure.

### SMTP timeout with uncertain result

1. Mark job `Needs attention` rather than `Failed` with auto-resend.
2. Compare SMTP outcome, send ID and Sent folder / destination test mailbox where safe.
3. Reconcile sent state or request explicit operator decision; record action.

### Production deploy regression

1. Freeze new changes and inspect latest deploy/error dashboards.
2. Roll back app build if schema remains compatible.
3. If data corruption suspected, restrict writes and initiate incident review/restore decision.
4. Record regression, mitigation and permanent test.

### Security incident

1. Contain compromised access, rotate credentials and preserve logs.
2. Notify Information Officer and follow POPIA response process in file 13.
3. Conduct authorized investigation, restore and verify integrity.
4. Communicate only verified facts to affected stakeholders.

## 8. Performance and cost guardrails

Measure hosting, database, storage, outbound bandwidth, job volume and email sync frequency. Choose the smallest sufficient resources; avoid persistent always-on infrastructure solely for cosmetic speed. Apply caching and query tuning before upgrading hardware. Review sending limits and account terms before scheduled/automated message volume grows.

## 9. Release sign-off checklist

- [ ] Owner accepts latest feature scope and known limitations.
- [ ] Production secrets and role permissions verified.
- [ ] Domain/TLS/redirect configuration correct.
- [ ] Both theme visuals and hard-edge constraint verified.
- [ ] Staging migration/seed/restore tests passed.
- [ ] Controlled Titan receive/reply/send reconciliation passed.
- [ ] Invoice reconciliation and payment ledger tests passed.
- [ ] Monitoring, runbooks, alerts and responsible operator defined.
- [ ] POPIA governance and retention decisions documented.
- [ ] Post-release smoke test owner assigned.
