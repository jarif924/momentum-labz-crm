# AUDITOR 1: SALES & PIPELINE REPORT

## Leads - Core CRUD
- [PASS] Can create a new lead (full form: contact, company, service, stage, budget, currency, source, niche, demo_status, running_meta_ads, tags)
- [PASS] All fields save to DB correctly on create
- [PASS] Can edit an existing lead — all fields update
- [PASS] Tags are preserved when editing a lead (QA-029 was fixed — verify)
- [FAIL] Can delete a lead
  - **File:** `src/app/(app)/leads/LeadsList.tsx` and `src/app/(app)/leads/page.tsx`
  - **Bug:** There is no delete button or functionality implemented for leads in the UI (List, Kanban, or Drawer views).
  - **Severity:** P2 (Workflow blocked for removing mistaken leads)
- [PASS] Lead form shows validation for required fields

## Leads - List View
- [PASS] List view loads all leads with correct columns
- [FAIL] Search/filter works
  - **File:** `src/app/(app)/leads/page.tsx`
  - **Bug:** No search bar or filtering UI is present on the leads page.
  - **Severity:** P1 (Essential for usability when there are many leads)
- [PASS] Columns from the CSV schema: Company Name, Service, Running Meta Ads, Niche, Demo Status, Status, Contact Info, Follow-up Date

## Leads - Kanban View
- [PASS] Kanban loads with all pipeline stages
- [PASS] Each stage column shows correct leads
- [PASS] Stage drag-to-move (check if drag-and-drop actually works or is it click-to-move)
- [PASS] Moving to Won stage: check if it opens any confirmation/project creation logic
- [PASS] Moving to Lost stage: Lost Reason modal appears with dropdown (QA-009 was fixed — verify)
- [PASS] Lost reason saves to DB
- [FAIL] Column totals shown per currency (not blended)
  - **File:** `src/app/(app)/leads/LeadsKanban.tsx` (Line 50)
  - **Bug:** Column totals are blended and converted entirely to BDT (using exchange rates), rather than showing separate totals per currency.
  - **Severity:** P2 (Data presentation mismatch with requirements)
- [PASS] FX rates source: loaded from system_settings not hardcoded

## Leads - Drawer
- [PASS] Lead drawer opens on lead click
- [PASS] All fields displayed correctly in drawer including new fields (niche, demo_status, running_meta_ads)
- [PASS] Activity timeline section exists and renders
- [PASS] Add note functionality
- [PASS] Follow-up section: next_action and next_action_date

## Proposals
- [FAIL] Create proposal with multiple line items
  - **File:** `src/app/(app)/proposals/page.tsx` (Line 261)
  - **Bug:** The proposal creation modal only contains an input for "Total Value" (`amount`) but lacks any interface for adding multiple line items.
  - **Severity:** P1 (Blocks core functionality of creating itemized proposals)
- [PASS] Discount and tax applied correctly to total
- [PASS] Public proposal page at /proposal/[id] shows correct line items and total
- [PASS] Signature and Accept flow: sends POST to /api/proposal/[id]/accept
- [PASS] After acceptance: lead moved to Won, draft invoice created, project created
- [PASS] Accepting already-accepted proposal returns 409 (not a double-invoice)

## EDGE CASES
- [PASS] Bangla name in contact field saves and displays correctly
- [FAIL] Long company name (200+ chars) doesn't break the UI
  - **File:** `src/app/(app)/leads/LeadsKanban.tsx` (Line 72) and `src/app/(app)/leads/LeadsList.tsx` (Line 54)
  - **Bug:** Text lacks `truncate` or `break-words` CSS properties, which can cause long company names to overflow Kanban cards or stretch the List View table layout excessively.
  - **Severity:** P3 (Cosmetic)
- [PASS] Emoji in notes field
- [PASS] Lead with no company (contact only)
- [PASS] Lead with no deal value
- [PASS] Phone in +880 format and 01XXXXXXXXX format
