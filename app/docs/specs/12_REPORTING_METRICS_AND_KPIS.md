# Reporting Metrics and KPI Definitions

**Version:** 1.0 working specification  
**Date:** 17 November 2026  
**Purpose:** Remove ambiguity between pipeline, invoicing, cash collection and project delivery.

## 1. Global reporting rules

- Timezone: `Africa/Johannesburg` for display and calendar-period boundaries; store events in UTC.
- Currency: ZAR unless explicitly approved otherwise. Display `R` with thousands separators and two decimals where precision matters.
- Default period: current calendar month in local business timezone, with an explicit period selector.
- Every report states whether it uses `created_at`, `issue_date`, `received_at`, `due_date` or `closed_at`.
- Amounts: **exclude VAT** for sales/project performance metrics unless metric explicitly says gross/incl VAT; invoice receipts show actual cash gross including tax.
- Avoid using the word `revenue` for all cash and invoice figures interchangeably. Financial accounting recognition is out of scope without policy/accounting integration.
- Archived clients/deals must be treated according to explicit status filters, not silently dropped from historic totals.

## 2. Canonical metric definitions

| Metric | Formula / source | Reporting caveat |
| --- | --- | --- |
| Active clients | Count `clients` with status `active` | A client with no current project can still be active |
| New clients MTD | Count clients first created within selected period | Back-dated imported records need explicit import policy |
| Active projects | Projects in `to_do`, `in_progress`, `in_review` (and optionally `on_hold` separately) | Clarify status list visibly; Backlog is not active delivery |
| Projects completed this month | Count distinct projects first transitioned to Completed within month | Reopened projects need controlled metric logic |
| Projects due this week | Non-completed projects with due date in local week | Exclude completed/canceled |
| Total open pipeline | Sum current amount of opportunities in Lead, Qualified, Proposal, Negotiation | **Exclude Won and Lost** |
| Weighted open pipeline | Sum `amount x probability/100` for open opportunities | Probability defaults must be documented/overridable by authorized user |
| Won value (period) | Sum value at close for Won opportunities whose `closed_at` is in period | Not same as revenue or collected cash |
| Sales win rate | Won / (Won + Lost) closed during period | Do not divide by all open deals |
| Open opportunities | Count opportunities in open stages | Won/Lost excluded |
| Invoiced MTD (excl VAT) | Sum issued invoice line subtotals (adjusted for valid credits) in period | Accounting treatment of voids/credits needs finance sign-off |
| Invoice gross issued | Sum issued invoice grand totals incl tax | For billing and customer balances |
| Cash collected MTD | Sum valid recorded payments with `received_at` in period | Counts received payments, not issued invoices |
| Outstanding balance | Sum `max(invoice grand total - valid payments,0)` on issued unpaid/partially paid invoices | Exclude void/draft invoices; decide credit handling |
| Overdue balance | Outstanding portion of invoices with `due_date` before report as-of date | Paid invoices excluded; no double count with outstanding card |
| Invoice collection rate | Cash collected on invoices in a defined cohort / cohort issued gross | Define cohort carefully; avoid misleading ratios |
| Task completion rate | Done tasks / tasks with relevant completion or due window | Show denominator and period |
| Project on-time delivery | Projects completed on/before due date / completed projects with due dates | Exclude incomplete projects from completed-cohort rate |
| Client retention | Active at period end among clients active at period start | Does not measure revenue retention |
| Mail sync freshness | Current time minus last successful sync per mailbox | A stale sync is an operational alert, not a sales KPI |

## 3. Worked example: invoice

Illustrative draft invoice:

```text
Website design & development      R180,000.00
Content migration and CMS setup    R40,000.00
Training and handover              R20,000.00
Subtotal                          R240,000.00
Illustrative VAT at 15%            R36,000.00
Grand total                       R276,000.00
Payment recorded                  R100,000.00
Remaining balance                 R176,000.00
```

**Illustrative tax only.** VAT applicability/rate, rounding and invoice wording must be approved for the real business; historical invoices store their original line tax rates. The example does not establish Oak & Pixel's real tax status or statutory treatment.

## 4. Pipeline example and dashboard consistency

If the Kanban includes four open stages totaling R2.4 million and Won totaling R1 million, the dashboard's **Open Pipeline** must show R2.4 million, not R3.4 million. Won value appears in a separate period-specific figure. Never treat an opportunity as both open and won simultaneously in the same current-state sum.

## 5. Finance/reporting restrictions

This CRM is not a full accounting ledger. It cannot certify audited revenue, tax payable, recognized profit or bank balances without approved accounting policies and reconciliation. `Payment recorded` means an authorized staff member entered a payment; it is **not** verified bank settlement unless a payment integration later supports it.

## 6. Dashboard presentation rules

- Every KPI has a label, optional as-of timestamp and an unambiguous period.
- KPI deltas name the comparison period; `+12%` without explanation is insufficient.
- Avoid misleading donut charts where segments do not sum to the total.
- Use consistent source queries across Overview, Client detail, Invoices and Reports.
- Respect permissions: contributors do not see whole-company financial metrics by default.
- Charts use sharp-edged containers and restrained green. Prefer bars/lines for performance over decorative effects.

## 7. Quality reconciliation checks

| Reconciliation | Rule |
| --- | --- |
| Invoice detail vs Invoices list | Gross totals, recorded payments, balance and status match exactly |
| Invoices list vs Reports | Same selected period and inclusion rules produce same figures |
| Pipeline board vs dashboard | Sum current open opportunity values matches displayed pipeline amount |
| Project board vs project list | Counts by stage agree for identical filters |
| Client view vs cross-client reports | Projects/invoices for client sum to the corresponding scoped report |
| Cash received report vs payments | Every non-voided payment counted once; negative corrections handled explicitly |

## 8. Open finance decisions

Confirm VAT registration/rate and tax rounding, invoice numbering, account reporting basis, currency policy for foreign clients, definition of client lifetime value, refunds/credit notes, and what invoice statuses mean. Record choices in file 14 before shipping financial metrics.
