# AUDITOR 5 — CLIENT PORTAL & PUBLIC PAGES
**File:** `qa/portal.md`  
**Prefix:** `QA-PORT-`  
**Date:** 2026-09-26  
**Auditor role:** Client Portal & Public Pages  
**Server:** http://localhost:3001

---

## Files Reviewed

| File | Lines |
|------|-------|
| `src/app/portal/[id]/page.tsx` | 226 |
| `src/app/proposal/[id]/page.tsx` | 29 |
| `src/app/proposal/[id]/ClientProposalView.tsx` | 161 |
| `src/app/api/portal/[project_id]/approve/[task_id]/route.ts` | 47 |
| `src/components/portal/PortalTaskApproveButton.tsx` | 51 |
| `src/app/print/invoices/[id]/page.tsx` | 168 |
| `src/middleware.ts` | 79 |
| `src/app/api/proposal/[id]/accept/route.ts` | 118 |

---

## DB Schema Verified

**`projects` columns:** `id, created_at, company_id, lead_id, name, service_line, status, budget, currency, start_date, target_date, repository_url, staging_url, production_url, total_ad_spend, leads_generated, est_roi_value`

**`proposals` columns:** `id, lead_id, amount, currency, services, status, document_url, created_at, line_items, valid_until, notes, title, discount_amount, tax_rate, sent_at, accepted_at`  
> **NOTE:** No `signature` column in proposals table — the accepted signature is appended to `notes`, not stored in a dedicated field.

**`tasks` columns:** `id, lead_id, title, due_at, completed, assigned_to, created_at, project_id, is_client_visible, requires_client_approval, is_out_of_scope, status, sort_order, description, priority, labels, checklist, task_type, parent_id, dri_name, loom_url`

**RLS Status:**

| Table | RLS Enabled |
|-------|-------------|
| `invoices` | ✅ Yes |
| `proposals` | ✅ Yes |
| `tasks` | ✅ Yes |
| `projects` | ✅ Yes |

---

## Checklist

### Middleware / Access Control

- [x] **PASS** — `/portal/[id]` is accessible without CRM login  
  `curl http://localhost:3001/portal/00000000-0000-0000-0000-000000000000` → HTTP 200 (calls `notFound()` server-side for missing project). Middleware correctly whitelists `/portal/`.

- [x] **FAIL** — `/proposal/[id]` is accessible without CRM login  
  Path is whitelisted at middleware level (`/proposal/` is in `publicPaths` on line 47). However, the page **crashes with HTTP 500** on every request due to a missing build artifact — see [BUG-PORT-01](#bug-port-01-critical--proposal-page-always-returns-http-500-build-artifact-broken).

- [x] **PASS** — `/invoices` redirects to `/login` when not logged in  
  `curl http://localhost:3001/invoices` → HTTP 307 → `http://localhost:3001/login` ✅

- [x] **PASS** — `/leads` redirects to `/login` when not logged in  
  `curl http://localhost:3001/leads` → HTTP 307 → `http://localhost:3001/login` ✅

- [x] **PASS** — `/api/leads/ingest` is in the public list  
  Line 47 of middleware confirms: `'/api/leads/ingest'` is whitelisted ✅

---

### Public Proposal Page (`/proposal/[id]`)

- [x] **FAIL** — Non-existent proposal ID: shows a friendly 404 page, not a crash  
  **Actual result: HTTP 500 crash on every request.** See [BUG-PORT-01](#bug-port-01-critical--proposal-page-always-returns-http-500-build-artifact-broken). The code is logically correct (`notFound()` on line 18 of `page.tsx`) but never executes.

- [x] **BLOCKED** — If a proposal exists: company name, line items, subtotal, tax, discount, total all shown  
  Cannot test: page returns 500. DB also has 0 proposal rows.

- [x] **BLOCKED** — Line items from `proposals.line_items` field are rendered  
  Cannot test: page returns 500.

- [x] **BLOCKED** — Signature input appears  
  Cannot test: page returns 500.

- [x] **PASS** (code-review) — Signature too short: validation message shown  
  `ClientProposalView.tsx` line 20–22: if `!signature.trim()` → sets error `'Please type your full name to sign.'` and returns early. The error is shown via line 154. ✅  
  The API also enforces `signature.length < 2` server-side (route.ts line 24). ✅

- [x] **FAIL** — Signature valid: form submits to `/api/proposal/[id]/accept`  
  The accept API route ALSO returns HTTP 500 due to the same missing vendor chunk. See [BUG-PORT-01](#bug-port-01-critical--proposal-page-always-returns-http-500-build-artifact-broken).

- [x] **BLOCKED** — After acceptance: success message shown  
  Cannot test: API is broken.

- [x] **PASS** (code-review) — Accepting again: 409 message shown  
  `accept/route.ts` line 34–36: checks `proposal.status === 'accepted'` and returns `{ status: 409, error: 'This proposal has already been accepted.' }`. `ClientProposalView.tsx` line 36 displays `data.error`. ✅  
  *(Cannot test live due to BUG-PORT-01)*

- [x] **BLOCKED** — Mobile layout at 390px: does the proposal page work?  
  Cannot test: page returns 500.

---

### Client Portal (`/portal/[id]`)

- [x] **PASS** — Non-existent project ID: friendly 404, not a crash  
  `portal/[id]/page.tsx` line 30–32: `if (projectRes.rows.length === 0) return notFound()`. Tested: `curl http://localhost:3001/portal/00000000-0000-0000-0000-000000000000` → HTTP 200, Next.js renders the built-in 404 page. ✅

- [x] **BLOCKED** — Existing project: project name, company shown  
  DB has 0 project rows. Cannot create test data (read-only). Blocked on empty DB.

- [x] **BLOCKED** — Tasks list: shows tasks marked as client-visible  
  DB has 0 tasks with `is_client_visible = true`. Blocked.

- [x] **PASS** (code-review) — Milestone/task approval button exists (`PortalTaskApproveButton`)  
  `portal/[id]/page.tsx` line 204–205: rendered when `task.requires_client_approval = true` and `!task.completed`. Component file exists and is correctly imported. ✅

- [x] **PASS** (code-review) — Approve button works: sends `POST /api/portal/[project_id]/approve/[task_id]`  
  `PortalTaskApproveButton.tsx` line 17: `fetch('/api/portal/${projectId}/approve/${taskId}', { method: 'POST' })`. Live test with valid UUIDs returns `{"error":"Task not found"}` (correct 404). ✅

- [x] **PASS** (code-review) — After approval: task marked 'Done' in DB  
  `approve/route.ts` lines 32–35: `UPDATE tasks SET completed = true, status = 'Done' WHERE id = $2`. ✅

- [x] **FAIL** — Request Changes: feature does not exist  
  No "Request Changes" button, textarea, or API endpoint exists in the portal code. [BUG-PORT-06](#bug-port-06-medium--request-changes-feature-missing-from-client-portal).

- [x] **PASS** (code-review) — Loom embed: if `loom_url` is set, it is embedded  
  `portal/[id]/page.tsx` lines 183–192: conditionally renders an `<iframe>` with `loom_url.replace('/share/', '/embed/')`. ✅

- [x] **PASS** (code-review) — ROI widget: `total_ad_spend`, `leads_generated`, `est_roi_value` shown  
  Lines 90–114: renders when `total_ad_spend > 0 || leads_generated > 0`. All three fields are displayed. ✅

- [x] **FAIL** — Pay button: present but dead (non-functional)  
  See [BUG-PORT-07](#bug-port-07-high--pay-button-is-completely-non-functional-dead-ui).

- [x] **FAIL** — No internal CRM data leaked in the portal page source  
  See [BUG-PORT-08](#bug-port-08-medium--portal-page-leaks-internal-budget-field-via-select-p).

---

### Portal Approve API (`/api/portal/[project_id]/approve/[task_id]`)

- [x] **PASS** — Requires valid project_id and task_id (UUID)  
  `approve/route.ts` line 18–19: SQL validates task belongs to project and `is_client_visible = true`.

- [x] **FAIL** — Invalid (non-UUID) IDs return 404, not 500  
  `curl -X POST http://localhost:3001/api/portal/invalid/approve/invalid` → **HTTP 500** (PostgreSQL UUID cast error propagates as 500). Should be 404. See [BUG-PORT-04](#bug-port-04-medium--portal-approve-api-returns-500-for-non-uuid-ids-instead-of-404).

- [x] **PASS** — Valid but non-existent UUIDs return 404  
  `curl -X POST http://localhost:3001/api/portal/00000000-0000-0000-0000-000000000000/approve/00000000-0000-0000-0000-000000000001` → `{"error":"Task not found"}` HTTP 404 ✅

- [x] **PASS** (code-review) — On success: `task.status = 'Done'` in DB  
  `UPDATE tasks SET completed = true, status = 'Done'` ✅

- [x] **FAIL** — Security: route is fully unauthenticated  
  See [BUG-PORT-05](#bug-port-05-high--portal-approve-api-is-completely-unauthenticated--no-token-required).

---

### Print Invoice (`/print/invoices/[id]`)

- [x] **FAIL** — Page accessible without CRM login? **NO — it is protected**  
  `curl http://localhost:3001/print/invoices/00000000-0000-0000-0000-000000000000` → HTTP 307 redirect to `/login`. The `/print/` path is **not** in the `publicPaths` list in middleware.  
  See [BUG-PORT-09](#bug-port-09-high--print-invoice-page-is-behind-crm-login-blocks-client-access).

- [x] **BLOCKED** — Page renders for a real invoice ID  
  Blocked: page is login-protected and DB has no invoice data to test with.

- [x] **PASS** (code-review) — Line items shown  
  `print/invoices/[id]/page.tsx` lines 112–124: iterates `invoice.line_items`, falls back to `invoice.notes` if no items. ✅

- [x] **PASS** (code-review) — Tax and discount shown  
  Lines 138–139: conditionally renders tax row and discount row in the totals section. ✅

- [x] **PASS** (code-review) — Agency name from settings shown  
  Line 72: `company.name || 'Your company'` from `system_settings.company_profile`. ✅

- [x] **PASS** (code-review) — Client details shown  
  Lines 84–87: `clientName`, `contactName`, `contactEmail` from `invoice.leads.contacts`. ✅

---

### Data Leakage Check

- [x] **FAIL** — Portal page source must not contain internal fields  
  `portal/[id]/page.tsx` line 22: `SELECT p.*` — fetches ALL project columns including `budget` (the agency's agreed budget). The `budget` field is a sensitive internal financial figure that should not be sent to the client's browser. See [BUG-PORT-08](#bug-port-08-medium--portal-page-leaks-internal-budget-field-via-select-p).

- [x] **FAIL** — `tasks` query uses `SELECT *`  
  `portal/[id]/page.tsx` line 36: `SELECT * FROM tasks WHERE ...` — sends all task columns to the browser including: `priority`, `labels`, `checklist`, `task_type`, `parent_id`, `dri_name`, `assigned_to`, `is_out_of_scope`. These are internal operational fields not meant for clients. See [BUG-PORT-03](#bug-port-03-medium--tasks-select--leaks-internal-task-fields-to-client-browser).

- [x] **PASS** (code-review) — Proposal page does not leak other proposals  
  `proposal/[id]/page.tsx` line 14: `.eq('id', params.id).single()` — only fetches the specific proposal by ID. ✅

- [x] **PASS** (code-review) — Proposal page does not expose internal cost data  
  The proposals table has no `cost_rate` field. The `notes` field is shown (accepted signature is appended to it); no other clients' data is selected.

---

## Bug Log

---

### BUG-PORT-01 `[CRITICAL]` — `/proposal/[id]` Page Always Returns HTTP 500 (Build Artifact Broken)

**Severity:** CRITICAL  
**File:** `.next/server/vendor-chunks/` (missing `@supabase.js` chunk)  
**Affected routes:** `GET /proposal/*`, `POST /api/proposal/*/accept`

**Description:**  
Both the public proposal view page (`src/app/proposal/[id]/page.tsx`) and its accept API (`src/app/api/proposal/[id]/accept/route.ts`) import `@supabase/supabase-js` (via `createAdminClient`). The compiled `.next/server/vendor-chunks/` directory is **missing the `@supabase.js` chunk**. Only `@swc.js`, `lucide-react.js`, and `next.js` are present.

This causes a fatal module-not-found error on every request:
```
Cannot find module './vendor-chunks/@supabase.js'
Require stack:
- .next/server/webpack-runtime.js
- .next/server/app/proposal/[id]/page.js
```

**Steps to Reproduce:**  
1. `curl -s http://localhost:3001/proposal/00000000-0000-0000-0000-000000000000`  
2. Observe HTTP 500 on every request (not just first load).

**Expected:** HTTP 404 (friendly not-found page) for unknown proposal ID.  
**Actual:** HTTP 500 with raw error exposed in `__NEXT_DATA__` JSON.

**Fix:** Delete `.next/` cache and run `next build` or restart `next dev` to recompile all vendor chunks.

---

### BUG-PORT-02 `[HIGH]` — Signature Not Stored in Dedicated DB Column

**Severity:** HIGH  
**File:** `src/app/api/proposal/[id]/accept/route.ts`, line 62  

**Description:**  
The client's typed signature is appended to the `proposals.notes` free-text column rather than a dedicated `accepted_signature` column:
```ts
notes: (proposal.notes || '') + `\n\nDigitally signed by: ${signature}`,
```
This means:
1. The signature is mixed into human-readable notes and could be overwritten by a future notes edit.
2. There is no audit trail with a timestamp separate from `accepted_at`.
3. Querying for "who signed this" requires string parsing of the notes field.

**Expected:** A dedicated `accepted_signature TEXT` column on the `proposals` table.  
**Actual:** Signature appended to `notes` string.

---

### BUG-PORT-03 `[MEDIUM]` — Tasks `SELECT *` Leaks Internal Task Fields to Client Browser

**Severity:** MEDIUM (data leakage)  
**File:** `src/app/portal/[id]/page.tsx`, line 36  

**Description:**  
The portal page fetches tasks with `SELECT * FROM tasks` and passes all rows to the server component, which embeds the full data in the rendered HTML/React payload. Internal fields sent to the client browser include:

- `priority` — internal team priority level
- `labels` — internal tag data
- `checklist` — internal sub-task items
- `task_type` — internal classification
- `parent_id` — internal task hierarchy reference
- `dri_name` — directly responsible individual (internal staff name)
- `assigned_to` — internal staff assignment UUID
- `is_out_of_scope` — internal scope management flag
- `lead_id` — internal CRM lead reference

**Steps to Reproduce:**  
Add a task with `is_client_visible = true`, open browser dev-tools on the portal page, inspect `__NEXT_DATA__` or the React props — all internal fields are present.

**Expected:** Only client-safe fields fetched: `id, title, description, status, completed, requires_client_approval, loom_url, sort_order`.  
**Actual:** All 22 task columns sent to client.

---

### BUG-PORT-04 `[MEDIUM]` — Portal Approve API Returns 500 for Non-UUID IDs Instead of 404

**Severity:** MEDIUM  
**File:** `src/app/api/portal/[project_id]/approve/[task_id]/route.ts`, lines 18–24  

**Description:**  
When non-UUID strings are passed as path parameters (e.g., `/api/portal/invalid/approve/invalid`), PostgreSQL throws an invalid UUID cast error which propagates as HTTP 500 instead of a clean 404.

```
curl -X POST http://localhost:3001/api/portal/invalid/approve/invalid
→ HTTP 500: {"error":"Internal Server Error"}
```

The SQL query `WHERE id = $1` with a non-UUID string causes `pg` to throw `invalid input syntax for type uuid`.

**Expected:** HTTP 404 `{"error":"Task not found"}`.  
**Actual:** HTTP 500 `{"error":"Internal Server Error"}`.

**Fix:** Validate `params.task_id` and `params.project_id` are valid UUIDs before querying, return 404 if not.

---

### BUG-PORT-05 `[HIGH]` — Portal Approve API Is Completely Unauthenticated — No Token Required

**Severity:** HIGH (security)  
**File:** `src/app/api/portal/[project_id]/approve/[task_id]/route.ts`  
**File:** `src/middleware.ts`, line 47  

**Description:**  
The approve API is whitelisted at the middleware level under `/api/portal/` and performs **zero authentication or authorization checks**. Any person who discovers or guesses a valid `project_id` + `task_id` UUID pair can approve any milestone on any project without the client's knowledge.

Since UUIDs are long, guessing is impractical, but:
- If a URL is shared or leaked (e.g., via browser history, logging, referrer headers), a third party can approve milestones.
- There is no client session, token, or HMAC verification — the portal is security-by-obscurity only.

**Mitigation options:**
1. Add a short-lived signed approval token (JWT or HMAC) to the portal URL that the API validates.
2. Or at minimum, rate-limit the approve endpoint.

**Current state:** Documented as intentional design but flagged as a security risk for production.

---

### BUG-PORT-06 `[MEDIUM]` — "Request Changes" Feature Missing from Client Portal

**Severity:** MEDIUM (feature gap)  
**File:** `src/app/portal/[id]/page.tsx`  

**Description:**  
The portal UI only allows clients to **approve** milestones. There is no "Request Changes" button, input, or API endpoint. Clients who want to reject or request modifications to a milestone have no in-app mechanism.

**Expected:** A "Request Changes" button (perhaps with a comments textarea) adjacent to "Approve Milestone".  
**Actual:** Feature entirely absent. Logged as BLOCKED/feature-gap.

---

### BUG-PORT-07 `[HIGH]` — Pay Button Is Completely Non-Functional (Dead UI)

**Severity:** HIGH  
**File:** `src/app/portal/[id]/page.tsx`, lines 126–128  

**Description:**  
The Payment & Billing card renders a prominently displayed pay button:
```tsx
<button className="px-5 py-2.5 bg-neutral-900 text-white ...">
  {project.currency === 'BDT' ? 'Pay with bKash' : 'Pay via Stripe'}
</button>
```

The button has **no `onClick` handler, no `href`, and no form action**. Clicking it does nothing. There is no Stripe integration, no bKash payment link, and no payment API route.

This button will be visible to all clients on every project portal and will appear to function (it looks like a CTA) but does nothing.

**Expected:** Button links to a Stripe checkout session, bKash payment link, or at minimum shows a modal with payment instructions.  
**Actual:** Dead `<button>` with no action.

---

### BUG-PORT-08 `[MEDIUM]` — Portal Page Leaks Internal `budget` Field via `SELECT p.*`

**Severity:** MEDIUM (data leakage)  
**File:** `src/app/portal/[id]/page.tsx`, line 22  

**Description:**  
The project query uses `SELECT p.*` which includes the `budget` column — the internal agreed budget the agency tracks per project. This is an internal financial figure (agency's budget ceiling or agreed deal amount) that is sent in full to the client's browser as part of the Next.js server component payload.

**Project columns exposed (beyond what is displayed):** `budget`, `service_line`, `company_id`, `lead_id`, `start_date`

**Expected:** Only display-necessary columns should be selected: `id, name, status, target_date, staging_url, production_url, repository_url, total_ad_spend, leads_generated, est_roi_value, currency`.  
**Actual:** Full row including `budget` (e.g., the agency's cost basis) is sent to client.

---

### BUG-PORT-09 `[HIGH]` — Print Invoice Page Is Behind CRM Login (Blocks Client Access)

**Severity:** HIGH  
**File:** `src/middleware.ts`, line 47  
**Route:** `/print/invoices/[id]`  

**Description:**  
The print invoice page (`/print/invoices/[id]/page.tsx`) is intended to allow printing/PDF generation of invoices, which may need to be shared with clients. However, the `/print/` path is **not in the `publicPaths` list** in middleware, so unauthenticated users are redirected to `/login`.

```
curl http://localhost:3001/print/invoices/00000000-0000-0000-0000-000000000000
→ HTTP 307 → /login
```

Additionally, the print page uses `createClient()` (browser Supabase client with anon key), not the admin client. If the page were made public, it would rely on RLS to gate access — but since the `invoices` table has RLS enabled and likely requires authentication, the page would show an empty/error state for unauthenticated visitors anyway.

**Decision needed:** Is this page intended for internal staff only (keep protected) or for clients (add to public paths + use token-gated access)?

---

### BUG-PORT-10 `[LOW]` — `repository_url` Field Mislabeled as "Figma / Assets" on Portal

**Severity:** LOW (UI confusion)  
**File:** `src/app/portal/[id]/page.tsx`, lines 143–150  

**Description:**  
The portal renders `project.repository_url` with the label **"Figma / Assets"** and a sub-label "View design files". The database column is named `repository_url`, implying it is meant for GitHub/GitLab repository links — not Figma. This creates confusion:
- If the URL is a GitHub repo, the label says "Figma / Assets".
- If the URL is a Figma link, the column name is misleading in the CRM.

**Expected:** Either rename the column to `design_url` or add a separate `repository_url` and `design_url` field, or make the label dynamic.  
**Actual:** Hard-coded "Figma / Assets" label on `repository_url`.

---

### BUG-PORT-11 `[LOW]` — `production_url` Field Is Checked in Condition But Never Rendered

**Severity:** LOW (dead code / missing link)  
**File:** `src/app/portal/[id]/page.tsx`, lines 132–152  

**Description:**  
The portal's "Actionable Links" section condition on line 132 includes `project.production_url` in its guard:
```tsx
{(project.staging_url || project.production_url || project.repository_url) && (
```
But inside the grid, **`production_url` is never rendered** — only `staging_url` and `repository_url` get their own link card. If a project has only `production_url` set (no staging, no repo), the grid container renders but is empty.

**Expected:** A "Production Environment" link card for `production_url`.  
**Actual:** `production_url` guards the section but produces no output.

---

### BUG-PORT-12 `[LOW]` — Timeline Dot Uses `task.completed` (boolean), Not `task.status === 'Done'`

**Severity:** LOW (visual inconsistency)  
**File:** `src/app/portal/[id]/page.tsx`, lines 172–173, 200  

**Description:**  
The portal milestone list renders completion state based on `task.completed` (boolean). The approve API sets **both** `completed = true` AND `status = 'Done'`. However, the portal's visual rendering (`bg-success-500` dot, strikethrough text, "Completed" badge, and hiding of the approve button) all rely exclusively on `task.completed`.

This is not broken today (the approve API sets both), but if any other mechanism sets `status = 'Done'` without setting `completed = true` (e.g., a future board column drag), the portal will show the milestone as still pending when it is actually done.

**Expected:** Render completion state from either `task.completed = true` OR `task.status = 'Done'`.  
**Actual:** Only `task.completed` is checked.

---

### BUG-PORT-13 `[LOW]` — Signature Minimum Length Mismatch Between Frontend and Backend

**Severity:** LOW  
**File (frontend):** `src/app/proposal/[id]/ClientProposalView.tsx`, line 20–22  
**File (backend):** `src/app/api/proposal/[id]/accept/route.ts`, line 24  

**Description:**  
The frontend only validates that `signature.trim()` is non-empty (any 1+ character passes). The backend requires `signature.length >= 2`. A single-character signature like `"A"` would pass the frontend check, hit the API, and receive a `400` error. The error is displayed but there is no frontend guidance about the minimum length requirement.

**Expected:** Frontend validates `signature.trim().length >= 2` and shows appropriate message.  
**Actual:** Frontend only checks truthiness; 1-character signatures show a confusing API error.

---

## Summary Table

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| BUG-PORT-01 | 🔴 CRITICAL | `/proposal/[id]` always 500 — missing @supabase vendor chunk | FAIL |
| BUG-PORT-02 | 🟠 HIGH | Signature stored in `notes` string, not dedicated column | FAIL |
| BUG-PORT-03 | 🟡 MEDIUM | Task `SELECT *` leaks internal fields (priority, labels, dri_name…) | FAIL |
| BUG-PORT-04 | 🟡 MEDIUM | Approve API returns 500 (not 404) for non-UUID path params | FAIL |
| BUG-PORT-05 | 🟠 HIGH | Portal approve API is fully unauthenticated (security-by-obscurity only) | FAIL |
| BUG-PORT-06 | 🟡 MEDIUM | "Request Changes" feature entirely missing from portal | BLOCKED/GAP |
| BUG-PORT-07 | 🟠 HIGH | Pay button is dead UI — no onClick, no payment integration | FAIL |
| BUG-PORT-08 | 🟡 MEDIUM | `SELECT p.*` leaks `budget` and other internal fields to client browser | FAIL |
| BUG-PORT-09 | 🟠 HIGH | Print invoice page requires CRM login — no public/client access | FAIL |
| BUG-PORT-10 | 🔵 LOW | `repository_url` mislabeled as "Figma / Assets" | FAIL |
| BUG-PORT-11 | 🔵 LOW | `production_url` in guard condition but never rendered | FAIL |
| BUG-PORT-12 | 🔵 LOW | Portal milestone dot uses only `task.completed`, not `task.status` | FAIL |
| BUG-PORT-13 | 🔵 LOW | Frontend signature min-length not enforced (1 char passes frontend, fails API) | FAIL |

**Total:** 1 Critical, 4 High, 4 Medium, 4 Low bugs found.  
**PASS:** 10 items | **FAIL:** 13 items | **BLOCKED:** 8 items (empty DB / proposal page broken)
