# Decision Log, Risks and Approval Checklist

**Version:** 1.0 working specification  
**Date:** 17 November 2026  
**Purpose:** Separate actual owner decisions from design assumptions and provider-dependent capabilities.

## 1. Confirmed decisions from product direction

| ID | Decision | Status |
| --- | --- | --- |
| D-001 | Brand and product are **Oak & Pixel**, a website agency CRM, separate from HIMARK | Confirmed |
| D-002 | Keep core functionality straightforward: clients, projects, pipeline, tasks, email, templates, invoices, reports, settings | Confirmed direction |
| D-003 | Premium minimalist architectural design with dark and light modes | Confirmed |
| D-004 | **Absolutely no rounded UI corners**, including every card, button, form field, menu, badge, modal and third-party component | Confirmed, non-negotiable |
| D-005 | Premium motion, loading, performance and interaction states | Confirmed |
| D-006 | Use robust Next.js/React/TypeScript, Tailwind/shadcn-style UI, Motion, Supabase-centric foundation | Confirmed direction, final vendor pinning pending engineering |
| D-007 | Existing business email is GoDaddy Professional Email powered by Titan; no required Microsoft 365 account | Confirmed |
| D-008 | Invoice `View` page is a CRM workspace screen, not merely a PDF/document view | Confirmed |
| D-009 | Projects must support a Kanban view | Confirmed |

## 2. Decisions required before or during implementation

| ID | Decision / question | Proposed default | Owner / due gate |
| --- | --- | --- | --- |
| O-001 | Is login for staff only, and what is official app name? | Internal `Oak & Pixel Workspace`; replace `CLIENT PORTAL` label | Owner / Phase 0 |
| O-002 | Number of team members and role boundaries? | Owner/Admin, Manager, Contributor, Finance | Owner / Phase 0 |
| O-003 | Which users can access each Titan mailbox? | Per-mailbox explicit read/compose/manage grants | Owner + security / Phase 0 |
| O-004 | One mailbox or multiple? | Start with one tested mailbox, adapter supports multiple later | Owner / Titan POC |
| O-005 | How are emails automatically linked? | Suggest match; confirmation required if ambiguous | Owner / Titan POC |
| O-006 | Which mailbox folders/actions are enabled? | Inbox/Sent read and compose; archive/delete after protocol validation | Engineering / Phase 4 |
| O-007 | What is the official brand font/logo/color master? | Provisional tokens in file 05, not yet approved | Owner + designer / Phase 0 |
| O-008 | VAT registration, rate, rounding, invoice numbering and credit notes? | Configurable tax; immutable issued snapshots; approval required | Owner/finance / Phase 5 |
| O-009 | Are online payments required in V1? | No; manual receipts only | Owner / Phase 0 |
| O-010 | Full proposal, quote, contract, report template editing at launch? | Email templates only in P0; documents in P1 | Owner / Phase 0 |
| O-011 | Data retention and staff communication privacy policy? | Formal policy must be approved before production | Information Officer / Phase 6 |
| O-012 | Hosting region and cross-border safeguards? | Review cloud vendor/region and POPIA conditions | Owner/security / Phase 0-6 |
| O-013 | Does external client portal exist at launch? | No; explicitly separate future phase | Owner / Phase 0 |
| O-014 | Company contact address, registration and invoice legal footer? | Use verified company information, not mockup data | Owner/finance / Phase 5 |
| O-015 | Service catalogue and stage defaults? | Website & CMS, Redesign, Brand & Website, SEO, Multimedia; stage set in PRD | Owner / Phase 2 |
| O-016 | Production domain and operational owners? | TBD | Owner / Phase 6 |

## 3. Technical unknowns to prove, not assume

| Risk ID | Unknown | Potential impact | Validation / mitigation |
| --- | --- | --- | --- |
| R-001 | Titan account permits required third-party IMAP/SMTP access | Email module blocked | Early connection spike using actual approved mailbox |
| R-002 | Titan app passwords, folders, flags and Sent behavior vary | Security or duplicate sent mail | Test and document account-specific capabilities |
| R-003 | SMTP response may be ambiguous after timeout | Client receives duplicate email | Send idempotency + reconcile before retry |
| R-004 | Email and file data leak through permissive RLS / grants | Serious confidentiality breach | Permission matrix, RLS integration tests, security review |
| R-005 | Mockups use inconsistent demo data and status math | Misleading KPIs | File 12 canonical metric definitions and seed consistency |
| R-006 | Imported UI library reintroduces rounded corners | Brand violation | Global tokens + computed-style visual checks |
| R-007 | Expensive UI animation slows interaction | Premium perception lost | Performance budgets, reduced motion, effect limits |
| R-008 | Tax/rate/legal text assumed from screenshot | Incorrect billing | Finance sign-off and configurable invoice rules |
| R-009 | Worker hosting cannot sustain mailbox sync | Delayed/missing correspondence | Queue-capable worker, backoff, sync freshness alerts |
| R-010 | Poorly scoped client portal broadens release | Delayed product delivery | Explicit Phase 2 decision, V1 staff-only assumption |

## 4. Design authority and sign-off

The following design priorities govern every screen:

1. Brand identity consistency with the architectural sign-in background.
2. **Every UI corner exactly 90 degrees, border radius 0px.**
3. Clean, compact typographic hierarchy with generous but disciplined spacing.
4. Seamless dark and light themes.
5. Smooth, restrained motion and immediate feedback.
6. Honest loading, sending, payment and saving states.
7. Context-linked records with no duplicated client/project data.

If a screenshot appears to contradict the written design rule, **the written zero-radius rule wins**.

## 5. Proposed owner sign-off record

| Approval area | Approver | Status | Notes / date |
| --- | --- | --- | --- |
| Functional V1 scope and priorities | Oak & Pixel owner | Pending | |
| Core branding/tokens and typography | Oak & Pixel owner | Pending | |
| Access roles and mailbox visibility | Oak & Pixel owner + security lead | Pending | |
| Titan integration capability test | Engineering + mailbox owner | Pending | |
| Billing/tax and invoice policy | Owner / finance | Pending | |
| POPIA/retention and hosting review | Information Officer | Pending | |
| QA/UAT release checklist | Owner + QA | Pending | |
| Production release | Oak & Pixel owner | Pending | |

## 6. Change request procedure

Any new requirement should state: problem, user, alternative solution, PRD ID, priority, impact on data/API/security/QA, and whether it can replace an existing item rather than expand scope. Update affected files and log the approval. A new visual idea is not automatic product scope.

## 7. Launch decision

**Current state: Planning pack prepared; production not approved.** The documentation is sufficiently detailed to begin design-system work, the Titan proof-of-concept and core data modeling, but it is not a substitute for business-rule approvals, a verified real mailbox, financial policy decisions and production security review.
