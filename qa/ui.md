# UI, UX & Accessibility Audit Report
**Prefix**: `QA-UI-`

## Global Design Rules
- [FAIL] No hardcoded hex colors: Found `bg-[#FDFDFD]` in `src/app/portal/[id]/page.tsx:53`.
- [FAIL] tabular-nums on all number displays: Used inconsistently. E.g., `LeadsKanban.tsx` BDT totals and card amounts use `toLocaleString()` but lack the `tabular-nums` class.
- [FAIL] Table headers (micro, uppercase, tracking-wider): `LeadsList.tsx` uses `text-sm text-neutral-500 font-medium`. Tasks page uses `text-xs uppercase font-bold tracking-wider` (close, but not `micro`). Inconsistent across the app.
- [PASS] Icons: Lucide only, strokeWidth=1.75.
- [PASS] Focus rings consistent.
- [PASS] No golden text on white background.
- [FAIL] Accent colors only used for meaning: Currency blending on Finance page (see below).

## Loading States
- [FAIL] Dashboard: No loading skeleton or spinner (Server Component missing `loading.tsx`).
- [FAIL] Leads page: Uses a simple "Loading leads..." pulsing text rather than a skeleton.
- [FAIL] Invoices page: Missing a proper skeleton/spinner.
- [FAIL] Proposals page: Missing a proper skeleton/spinner.
- [FAIL] Tasks page: Missing a proper skeleton/spinner (just renders empty if loading state isn't explicitly handled).
- [FAIL] Finance page: Uses pulsing text instead of a skeleton.
- [FAIL] Brainstorming: Missing a proper skeleton/spinner.

## Empty States
- [FAIL] Leads list: empty state with CTA. Currently just renders a table row with text "No leads found. Create one to get started." Does not use `<EmptyState>`.
- [FAIL] Leads kanban: empty state. When no leads exist, it just shows empty columns with no clear CTA to add leads.
- [FAIL] Tasks list: empty state. Renders an empty table body with no message if there are no uncompleted tasks.
- [FAIL] Invoices: empty state. Uses basic text rather than the standard component.
- [FAIL] Proposals: empty state. Uses basic text rather than the standard component.
- [FAIL] Brainstorming: no notes → empty state. Uses basic text.
- [FAIL] Finance/Expenses: empty state. Just shows "No expenses tracked yet." text.
*(Note: The `EmptyState` component itself is duplicated between `src/components/ui/EmptyState.tsx` and `src/app/(app)/settings/_components/ui.tsx` and rarely used outside Settings/Drawer)*

## Forms
- [FAIL] Required fields marked: `LeadFormModal.tsx` requires a Contact (`!formData.contact_id` disables submit) but the label does not have an `*` or indicator.
- [PASS] Submit button disabled while saving.
- [PASS] Success feedback on save.
- [PASS] Error feedback on failure.
- [PASS] No double-submit possible.

## Modals
- [PASS] All modals close on Escape key.
- [PASS] All modals close on outside click.
- [PASS] Modals have visible X button.
- [PASS] Long modal content is scrollable (`overflow-y-auto`).

## Copy & Text
- [PASS] Grep for 'Lorem' in src/ — None found.
- [PASS] Grep for 'TODO' in src/ — None found.
- [PASS] Grep for 'placeholder' text like 'coming soon' — None found.
- [PASS] Consistent terminology.
- [PASS] Any obvious typos in labels, buttons, headings.

## Console Errors
- [FAIL] List any console.log() or console.error() calls left in production code:
  - `src/app/portal/[id]/page.tsx:44` (`console.error`)
  - `src/app/api/leads/ingest/route.ts:151` (`console.log`)
  - `src/app/api/leads/ingest/route.ts:161` (`console.error`)
  - `src/app/(app)/error.tsx:13` (`console.error`)
  - `src/app/api/portal/[project_id]/approve/[task_id]/route.ts:39` (`console.error`)
- [PASS] Note any that expose sensitive data: None obviously expose sensitive data, mostly error boundaries.

## Mobile Responsiveness (code review)
- [PASS] Dashboard: is it mobile-responsive (uses flex-col or grid-cols responsive classes).
- [PASS] Leads list: horizontal scroll on mobile or responsive (`overflow-x-auto`).
- [PASS] Sidebar: is there a mobile hamburger menu (`md:hidden fixed bottom-6 right-6`).
- [PASS] Modals: are they usable on 390px screens (`max-w` + relative sizing).

## Consistency Check
- [PASS] Card styles consistent across all pages.
- [PASS] Button styles consistent.
- [FAIL] Table headers consistent (all uppercase, tracking-wider). Leads is normal case, Tasks is uppercase but `text-xs`.
- [PASS] Modal styles consistent.
- [FAIL] Empty state style consistent. Huge drift here. Some pages use custom divs (Projects), most use just text strings, Settings uses the `EmptyState` component.
- [FAIL] Loading state style consistent. Huge drift here. Dashboard has none, others have pulsing text.

## Specific Issues to Check
- [PASS] BDT numbers: formatted with Intl.NumberFormat or toLocaleString? Yes, using `.toLocaleString()`.
- [FAIL] Do any pages blend currencies in totals (GLOBAL_RULES violation)? YES! `src/app/(app)/finances/page.tsx`:
  - `pipelineValue` sums proposal amounts regardless of currency and displays it as BDT (`fmt(pipelineValue, 'BDT')`).
  - `totalExpenses` sums all expense amounts regardless of currency and outputs it as BDT (`৳{totalExpenses.toLocaleString()}`).
- [PASS] Sidebar: 'Brainstorming' is in 'Workspace' section.
- [PASS] Sidebar: 'Analytics' label — is it accessible (it is just text with an icon, standard pattern).
- [PASS] Error boundary (error.tsx): does it look good? (Basic but standard).

## Detailed Log

| File+Line | Issue | Severity | Suggested Fix |
|---|---|---|---|
| `src/app/portal/[id]/page.tsx:53` | Hardcoded hex color `bg-[#FDFDFD]` | P2 | Replace with Tailwind neutral color class. |
| `src/app/(app)/leads/LeadsList.tsx:12` | Table header violates `GLOBAL_RULES` | P2 | Use `text-micro uppercase tracking-wider text-neutral-400`. |
| `src/app/(app)/leads/LeadsList.tsx:32` | Missing `EmptyState` component | P2 | Replace `<tr>` text with `<EmptyState icon={Users} title="..." action={<Button>} />` wrapped in a table span. |
| `src/app/(app)/leads/LeadsKanban.tsx:51` | BDT and Deal Value lack `tabular-nums` | P3 | Add `tabular-nums` class to currency displays. |
| `src/app/(app)/leads/LeadFormModal.tsx:35` | Required fields not marked visually | P3 | Add `*` to labels of required fields like Contact. |
| `src/app/(app)/finances/page.tsx:68` | Pipeline value sums multi-currency proposals directly | P0 | Filter `proposals` by currency or apply `fxRates` before summing. |
| `src/app/(app)/finances/page.tsx:30` | Total expenses sums multi-currency expenses directly | P0 | Filter `expenses` by currency or apply `fxRates` before summing. |
| `src/app/(app)/tasks/page.tsx:84` | No empty state for uncompleted tasks list | P2 | Add an empty state check in `<tbody>` when `tasks.filter(t => !t.completed).length === 0`. |
| `src/app/(app)/projects/page.tsx:53` | Custom empty state design drifting from standard | P2 | Use the standard `EmptyState` component instead of custom markup. |
| `src/app/(app)/page.tsx` | Missing loading skeleton | P1 | Add `loading.tsx` for the app route to prevent blocking navigations. |
