# Real-World Journeys (E2E) Audit Report

## JOURNEY 1: Study-Abroad Consultancy Deal
**Status**: PARTIAL
**Summary**: The journey works structurally, but fails fundamentally at the proposal creation stage due to missing UI fields for line items, discounts, and taxes. Furthermore, there are discrepancies in LTV calculation and invoice immutability.

### Points of Failure

1. **Proposal Creation (Missing Line Items)**
   - **File**: `src/app/(app)/proposals/page.tsx`
   - **Severity**: P0
   - **Expected**: Admin can add multiple line items, discount, and tax rate to a proposal.
   - **Actual**: The proposal creation modal only contains a single `amount` input and a multi-select for `services`. There are no inputs for line items, discount, or tax rate. The backend schema supports them, and `ClientProposalView.tsx` expects them, resulting in an empty table being rendered for the client.
   - **Non-technical confusion**: "I can't itemize my proposal, how does the client know what they're paying for?"

2. **Signature Validation Mismatch**
   - **File**: `src/app/proposal/[id]/ClientProposalView.tsx` (Line 20) vs `src/app/api/proposal/[id]/accept/route.ts` (Line 24)
   - **Severity**: P2
   - **Expected**: Frontend validation should match backend validation (2-120 characters).
   - **Actual**: Frontend only checks `!signature.trim()`, allowing a 1-character signature which is then rejected by the backend with a 400 error.

3. **Paid Invoice Editing**
   - **File**: `src/app/(app)/invoices/page.tsx`
   - **Severity**: P1
   - **Expected**: Once an invoice is marked as paid, it should be locked from editing to maintain financial integrity.
   - **Actual**: Paid invoices can be edited indefinitely. An admin can change the line items and amount of an already paid invoice.

4. **Client LTV Calculation**
   - **File**: `src/app/(app)/clients/page.tsx` (Lines 58-61)
   - **Severity**: P1
   - **Expected**: LTV should be calculated based on actual paid invoices.
   - **Actual**: LTV is calculated by summing the `deal_value` of 'Won' leads. This ignores whether the client actually paid the invoices or if the proposal amount differed from the initial lead deal value.

## JOURNEY 3: Lost Deal
**Status**: YES
**Summary**: The lost deal flow works as intended.

### Findings
- The UI properly triggers the Lost Reason modal when moving a lead to a lost stage.
- The `lostReason` and `lostDetails` are correctly concatenated and saved to the `lost_reason` field.
- Lost leads are correctly excluded from active pipeline calculations on the dashboard.

## JOURNEY 5: Month-End for the Founder
**Status**: PARTIAL
**Summary**: While basic metrics are available, crucial financial health indicators like profit (revenue - expenses) and proper multi-currency tracking for outstanding/overdue balances are missing or broken.

### Points of Failure

1. **Outstanding/Overdue by Currency Broken**
   - **File**: `src/app/(app)/finances/page.tsx` (Lines 126, 133)
   - **Severity**: P1
   - **Expected**: Outstanding and overdue totals should be separated by currency or converted to a base currency.
   - **Actual**: The UI hardcodes `fmt(outstandingMap['BDT'] || 0, 'BDT')` and `fmt(overdueMap['BDT'] || 0, 'BDT')`. It completely ignores outstanding or overdue invoices in USD or AUD.

2. **Dashboard Profitability Unclear**
   - **File**: `src/app/(app)/page.tsx`
   - **Severity**: P2
   - **Expected**: The dashboard should give a clear picture of profitability.
   - **Actual**: The dashboard only shows "Cash Collected" (Revenue). Because it doesn't surface expenses, a founder cannot answer "did we make money this month?" at a glance.

3. **Missing Service Line Revenue & Project Profitability**
   - **File**: `src/app/(app)/analytics/page.tsx`
   - **Severity**: P2
   - **Expected**: Analytics should show revenue generated per service line and profit per project.
   - **Actual**: Analytics only shows the *count of leads* per service line. Revenue by service line and project-level profit tracking are completely absent.

## MISSING FEATURES
- **Proposal Line Items UI**: Full support for adding, editing, and removing line items, discounts, and tax rates in `proposals/page.tsx`.
- **Proper Multi-Currency Finance Tracking**: The finance overview needs to properly display outstanding and overdue balances across all currencies, not just BDT.
- **Invoice Locking**: Mechanism to lock invoices from edits once marked as `paid`.
- **Accurate LTV Calculation**: `clients/page.tsx` needs to aggregate actual paid invoices, not lead deal values.
- **Revenue by Service Line**: Analytics should calculate actual won revenue per service line, not just lead counts.
- **Project Profitability**: Tracking expenses against specific projects to calculate profit margins per project.
- **Dashboard Expense/Profit Rollup**: Surfacing total expenses and net profit on the main dashboard to give a true financial picture.
