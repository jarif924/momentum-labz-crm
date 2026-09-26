# QA Report: Settings, Admin & Brainstorming

## Settings - Company Profile tab
- [PASS] Agency name saves and reflects on invoices
- [PASS] Email, phone, address save
- [FAIL] Logo upload works (or is it stubbed?)
- [PASS] Changes persist after page refresh

**Issue Details:**
- **File/Line:** `src/app/(app)/settings/_components/FormSections.tsx:73`
- **Steps:** Navigate to Settings > Company Profile. Look for a logo upload field.
- **Expected:** A file input or upload widget should be present to upload the company logo.
- **Actual:** The logo upload field is completely missing from the UI and state. Only text fields (name, email, phone, etc.) exist.
- **Severity:** Medium (Cannot brand invoices/CRM without logo).

## Settings - Team Members tab
- [PASS] Add Member form shows all fields
- [PASS] Adding a member creates a user in the DB
- [PASS] Error shown if email already exists
- [PASS] Role change saves
- [PASS] Password reset send works
- [PASS] Can a member be deactivated?

## Settings - Pipeline tab
- [PASS] Pipeline stages list shows all 9 stages
- [PASS] Add new stage works
- [PASS] Rename a stage works and the change appears on the Leads Kanban
- [PASS] Delete a stage: what happens to leads in that stage? (Warns and provides a dropdown to move leads).
- [PASS] Stage reorder: is drag-and-drop implemented or just a handle with no functionality? (Drag-and-drop works).
- [PASS] Won/Lost flags shown correctly on stages
- [PASS] Lost reasons list: add, edit, delete
- [PASS] Lead sources list: add, edit, delete

## Settings - Services tab
- [PASS] Add a service — appears in lead form and proposals
- [PASS] Delete a service — does it affect existing leads with that service? (Leads keep the service, but it's removed from future choices).

## Settings - Custom Fields tab
- [PASS] Create a text field
- [PASS] Create a number field
- [PASS] Create a dropdown field with options
- [PASS] Create a checkbox field
- [PASS] Created fields appear in the lead form (LeadFormModal)
- [PASS] Custom field values save and load correctly

## Settings - Tags tab
- [PASS] Add a tag
- [PASS] Tag appears in lead form
- [PASS] Bulk tag from leads list works

## Settings - Currency & FX tab
- [PASS] USD rate saves
- [PASS] AUD rate saves
- [PASS] After save, the rate loads from DB (not hardcoded) in Kanban columns

## Settings - Invoicing tab
- [PASS] Invoice prefix saves (e.g. changing ML- to INV-)
- [PASS] Year toggle saves
- [PASS] Default tax rate saves
- [PASS] Payment terms days save
- [PASS] Payment gateway default saves
- [PASS] Payment instructions text saves (saved as footer note)
- [PASS] After save, new invoices use the updated prefix and settings

## Brainstorming (/brainstorming)
- [PASS] Create a new note — QA-SET- prefix in title
- [PASS] Note appears in the left panel list
- [PASS] Can type a long body text
- [PASS] Title edit (click on title) saves on blur
- [PASS] Status dropdown changes (Idea → In Progress → Done → Archived)
- [PASS] Save button saves content
- [PASS] Delete note — confirmation shown, note removed from list
- [PASS] Empty state shown when no notes exist
- [PASS] Multiple notes — switching between them loads the correct content

## Contacts (/contacts)
- [PASS] Add contact with company
- [PASS] Add contact without company
- [PASS] Edit contact
- [PASS] Delete contact that has leads — does it block or warn? (Warns about foreign key constraints).
- [PASS] Bangla name displays correctly

## Clients (/clients)
- [PASS] Client list shows correctly
- [FAIL] LTV (lifetime value) is the sum of paid invoices for that client
- [FAIL] LTV is per-currency (not blended)

**Issue Details:**
- **File/Line:** `src/app/(app)/clients/page.tsx:57-60`
- **Steps:** Navigate to Clients page. Check the LTV calculation logic.
- **Expected:** LTV should calculate the sum of paid invoices per currency for each client.
- **Actual:** LTV calculates the sum of `deal_value` of `Won` leads instead of paid invoices. Furthermore, it blends leads of different currencies by indiscriminately summing their deal values and applying the currency of the very first lead (`client.leads?.[0]?.currency`).
- **Severity:** High (Inaccurate financial metrics).

## Global Search (Topbar)
- [FAIL] Search for a lead by name
- [FAIL] Search for a contact
- [FAIL] Search for a company
- [FAIL] Search for a project
- [FAIL] Bangla search term
- [FAIL] Empty results shows a friendly empty state

**Issue Details:**
- **File/Line:** `src/components/shell/Topbar.tsx:94-100`
- **Steps:** Click on the Global Search input in the topbar and type any query.
- **Expected:** Should search and display leads, contacts, companies, and projects matching the query (including Bangla), with an empty state if no results.
- **Actual:** The search input is completely stubbed out. There is no `onChange` handler, no search state, and no results dropdown implemented.
- **Severity:** High (Core navigation feature missing).
