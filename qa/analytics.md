# Audit Report: Analytics & Attribution (Auditor 3)

**Date:** 2026-09-26  
**Auditor:** AUDITOR 3 — Analytics & Attribution  
**Test data prefix:** `QA-ANA-`  
**Output file:** `qa/analytics.md`

---

## Executive Summary

| Category | PASS | FAIL | BLOCKED |
|---|---|---|---|
| Lead Ingest API | 7 | 4 | 0 |
| Analytics Page | 4 | 4 | 0 |
| Dashboard | 3 | 5 | 0 |
| Edge Cases | 2 | 2 | 0 |
| Missing Features | 0 | 0 | 5 |
| **TOTAL** | **16** | **15** | **5** |

> [!CAUTION]
> Multiple CRITICAL bugs found: Dashboard queries reference columns that don't exist in the DB (`assignee_id`, `owner_id`), which will silently return wrong counts for role=`member` users. The lead ingest API returns 500 (not 4xx) on malformed JSON. Notifications are never written on new lead ingest. Dedup returns HTTP 200 instead of 409.

---

## 1. Schema Reference

### `leads` table columns (relevant to analytics):
`id`, `contact_id`, `company_id`, `services`, `region`, `source`, `stage`, `deal_value`, `currency`, `lost_reason`, `assigned_to`, `next_follow_up_at`, `created_at`, `updated_at`, `service_line`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `fbclid`, `fbp`, `fbc`, `click_id`, `lead_score`, `budget_tier`, `timeline`, `landing_page`, `submission_url`, `raw_payload`, `ttclid`, `referrer_url`, `client_ip`, `niche`, `demo_status`, `running_meta_ads`, `next_action_type`, `next_action_date`, `next_action_notes`

**UTM columns:** `text` type with NO `character_maximum_length` constraint — unbounded.

### `pipeline_stages`:
`Prospect Found` | `Demo Built` | `Outreach Sent` | `Replied / Engaged` | `Call Booked` | `Proposal Sent` | `Negotiation` | `Won (is_won=true)` | `Lost (is_lost=true)`

---

## 2. Lead Ingest API (`/api/leads/ingest`)

### API Header Bug — CRITICAL (affects all tests)

The route (`src/app/api/leads/ingest/route.ts`, line 18) reads header `x-crm-api-key`:
```ts
const apiKey = req.headers.get('x-crm-api-key');
```

But the parent agent's test scripts sent header `x-api-key`. **This is a documentation/integration mismatch** — the CORS header whitelist (line 7) also only allows `x-crm-api-key`. Tests below were re-run with the correct header `x-crm-api-key`.

---

### Checklist

#### ✅ PASS — Valid payload accepted (returns 201 with `lead_id`)

**Test 1 — Full UTM lead:**
```
POST /api/leads/ingest  [x-crm-api-key: correct]
Body: contact.full_name="QA-ANA-Lead1", contact.email="qa-ana-1@test.com", attribution.utm_source="facebook", etc.
Response: 201 {"success":true,"lead_id":"329d873d-bdb0-4de6-887e-f61b817445bb","message":"Lead ingested and prioritized successfully"}
```
- **Note:** Response returns HTTP **201**, not 200. Acceptable.

---

#### ✅ PASS — Missing API key rejected (HTTP 401)

```
POST /api/leads/ingest  [no API key header]
Response: 401 {"success":false,"error":"Unauthorized"}
```

---

#### ✅ PASS — Wrong API key rejected (HTTP 401)

```
POST /api/leads/ingest  [x-crm-api-key: WRONG_KEY_12345]
Response: 401 {"success":false,"error":"Unauthorized"}
```

---

#### ❌ FAIL — Malformed JSON returns 500 instead of 400

**Test 4:**
```
POST /api/leads/ingest  [x-crm-api-key: correct]
Body: NOT_JSON_AT_ALL
Response: 500 {"success":false,"error":"Internal Server Error"}
```
**Bug:** `req.json()` throws a parse error which is caught by the generic `catch` handler (line 160-165) and returned as 500. A malformed request body is a **client error** (4xx), not a server error (5xx). The route should catch JSON parse errors explicitly and return 400.

**Fix needed:** Wrap `await req.json()` in a try/catch and return `{status: 400, error: 'Invalid JSON payload'}`.

---

#### ✅ PASS — `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` stored in leads table

DB verification for `QA-ANA-Lead1`:
```json
{
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "study-abroad-bd",
  "utm_content": "carousel-ad",
  "utm_term": null
}
```
All 4 UTM fields stored correctly. `utm_term` is `null` (not provided → null, correct).

---

#### ✅ PASS — `fbclid` stored

```json
{ "fbclid": "FB_TEST_CLICK_123" }
```
Stored correctly.

---

#### ✅ PASS — `gclid` stored (column exists)

Column `gclid` exists in leads table. For `QA-ANA-Lead1`: `gclid: null` (not provided → null). Column is mapped at insert line 124-125 of route. PASS.

---

#### ✅ PASS — Lead score calculated

Scoring rules (from `route.ts` lines 86–100):

| Field | Value | Points |
|---|---|---|
| `budget_tier` | `10k_plus` | +50 |
| `budget_tier` | `5k_to_10k` | +40 |
| `budget_tier` | `3k_to_5k` | +25 |
| `budget_tier` | `1k_to_3k` | +10 |
| `timeline` | `immediate` | +25 |
| `timeline` | `within_1_month` | +15 |
| `timeline` | `1_to_3_months` | +5 |
| `company_name` provided | — | +10 |
| `phone` provided | — | +10 |
| `message.length > 50` | — | +5 |

**QA-ANA-Lead1:** `budget_tier=5k_to_10k` (+40) + `timeline=immediate` (+25) + `company_name` (+10) + `phone` (+10) + `message >50 chars` (+5) = **90** ✅ (DB confirmed: `lead_score: 90`)

**QA-ANA-Lead2:** No budget/timeline/company/phone/message → **0** ✅ (DB confirmed: `lead_score: 0`)

---

#### ❌ FAIL — Dedup returns HTTP 200 instead of 409

**Test 5 — Same email within 60s:**
```
Response: 200 {"success":true,"status":"duplicate_suppressed"}
```
**Bug (route.ts line 50):** The dedup path returns `status: 200`. Standard practice for "duplicate detected, skipping insert" should return **409 Conflict** or at minimum a clear status. Returning 200 with `success:true` makes it indistinguishable from a successful ingest to naive callers. Downstream integrations (Zapier, Make.com) may silently miss duplicates thinking the lead was created.

---

#### ✅ PASS — Lead with no UTM: accepted, UTM fields are null (not empty string)

**QA-ANA-Lead2** (no attribution block sent):
```json
{
  "utm_source": null, "utm_medium": null, "utm_campaign": null,
  "utm_content": null, "utm_term": null, "fbclid": null, "gclid": null
}
```
All null — correct. No empty strings.

---

#### ❌ FAIL — No notification written to `notifications` table on new lead ingest

**Bug:** The ingest route (line 149-152) has a **stub** for `PRIORITY_LEAD` notification, but it only calls `console.log()` — it **never writes to the `notifications` table**:
```ts
// 10. Notification Stub
if (tagString === 'PRIORITY_LEAD') {
  console.log(`🚀 [WEBHOOK STUB] Sending PRIORITY_LEAD alert to Slack/WhatsApp for Lead ID: ${leadId} | Score: ${score}`);
}
```
DB verification: `notifications` table has **0 rows** after ingesting 3 leads (including QA-ANA-Lead1 which scored 90 = `PRIORITY_LEAD`).

**Fix needed:** Replace `console.log` stub with an actual `INSERT INTO notifications` call.

---

#### ❌ FAIL — Payload schema mismatch: documented vs actual

**Bug:** The route expects a **nested payload**:
```json
{
  "contact": { "full_name": "...", "email": "...", "phone": "..." },
  "project_details": { "service_interest": "...", "budget_tier": "..." },
  "attribution": { "utm_source": "...", "fbclid": "..." }
}
```

But the parent agent's audit instructions describe a **flat payload**:
```json
{
  "source": "facebook_ads", "name": "...", "email": "...", "utm_source": "...", "fbclid": "..."
}
```

With the flat payload, `payload.contact` is `undefined`, so the guard at line 30 (`if (!contactData || !contactData.full_name)`) triggers a 400. **The API surface contract is not documented in any README or OpenAPI spec.** External callers (Facebook Lead Ads webhook, website forms) would be unable to integrate without reading the source code.

---

## 3. Analytics Page (`/analytics`)

### Page Load

#### ✅ PASS — Page loads without error (HTTP 307 → redirects to login for unauthenticated; authenticated sessions load the page client-side via `useEffect`)

Source code review confirms no SSR errors. `createBrowserClient` + `useEffect` data fetch is safe from server-side crashes.

---

#### ❌ FAIL — No period selector on Analytics page

The analytics page (`src/app/(app)/analytics/page.tsx`) has **no `PeriodSelector` component and no date filter**. The `useEffect` fetches **ALL leads from all time** with `supabase.from('leads').select('*')`. There is no `period` parameter, no date range filter, and no way for the user to filter by time period.

**Impact:** As the dataset grows, the analytics page will:
1. Load all leads into browser memory (N+1 performance concern)
2. Show only all-time stats — no period comparison

---

#### ❌ FAIL — Charts exist but no campaign-level breakdown

**Charts/Sections that EXIST on the analytics page:**

| # | Component | Type | Description |
|---|---|---|---|
| 1 | Win Rate | Stat card | `won / (won + lost) * 100` |
| 2 | Avg Deal Velocity | Stat card | Days from created → updated for won leads |
| 3 | Active Pipeline | Stat card | Count of non-won, non-lost leads |
| 4 | Total Leads | Stat card | All-time count |
| 5 | Top Acquisition Channels | Bar list | UTM source / lead source, win rate per channel |
| 6 | Pipeline Distribution | Horizontal bar | Count per pipeline stage |
| 7 | Lost Reason Breakdown | Horizontal bar | Count per lost_reason field |
| 8 | Region Split | Progress bars | Bangladesh vs International counts |
| 9 | Service Lines | Count list | tech_solutions / web_development / marketing |

**Missing:** No `utm_campaign` breakdown. "Top Acquisition Channels" only groups by `utm_source || source` (line 81). A lead from `facebook/cpc/study-abroad-bd` and `facebook/cpc/visa-leads` both appear as "facebook" with no campaign drill-down.

---

#### ❌ FAIL — Win rate formula has an edge case (division by zero when `won=0, lost=0`)

**Code (line 108):**
```ts
const winRate = total > 0 ? Math.round((won / (won + lost)) * 100) || 0 : 0
```
- When `won=0, lost=0` and `total > 0` (all leads active): `0/0 = NaN` → `Math.round(NaN) = NaN` → `NaN || 0 = 0`. The `|| 0` fallback **saves it from displaying NaN** ✅.
- When `won=0, lost=0, total=0`: outer ternary returns 0 ✅.
- **However**, the formula `won / (won + lost)` uses only won+lost as denominator, **not total**. This is intentional (win-rate among resolved deals), but it means a pipeline with 100 active leads and 0 won/lost shows **"Win Rate: 0%"** which is misleading — it should read "No closed deals yet."

---

#### ❌ FAIL — Service Lines tracking is hardcoded to 3 values only

**Code (line 68):**
```ts
const services: Record<string, number> = { 'tech_solutions': 0, 'web_development': 0, 'marketing': 0 };
```
Any lead with `service_line` not matching these three values (e.g., `general_inquiry`, future additions) will be silently dropped. The `if` check at line 88 (`services[l.service_line] !== undefined`) will skip them. New service lines added to the DB schema will not appear without a code change.

---

#### ✅ PASS — No NaN/Infinity display in charts with 0 leads

Pipeline funnel (line 203): `Math.max(...funnelData.map(d => d.count), 1)` — the `,1` prevents division by zero when all counts are 0. Width correctly floors at 1% via `Math.max(pct, 1)`.

Source bars (line 184): `Math.max(s.rate, 2)` — prevents 0-width bar. Safe.

Lost reasons (line 232): Same `Math.max(..., 1)` pattern. Safe.

---

#### ✅ PASS — Source/attribution chart exists

"Top Acquisition Channels" panel shows channel-level breakdown with win rate per channel. Data comes from `utm_source || source` field. Top 5 channels displayed.

---

## 4. Dashboard (`/`)

### Data Architecture

The dashboard (`src/app/(app)/page.tsx`) is a **Server Component** that fetches data at request time using the Supabase server client. The `PeriodSelector` updates URL params (`?period=xxx`) which triggers a full server re-render with the new period. This is the correct Next.js 14 pattern.

---

#### ✅ PASS — Dashboard numbers load from DB

All KPI queries execute via Supabase server client. Data is rendered server-side.

---

#### ❌ FAIL — `owner_id` column does not exist in leads table

**Code (page.tsx, lines 66-70):**
```ts
if (role === 'member') {
  followupsQ = followupsQ.eq('owner_id', user.id);     // ❌ column: owner_id → does not exist
  staleLeadsQ = staleLeadsQ.eq('owner_id', user.id);   // ❌ column: owner_id → does not exist
  focusLeadsQ = focusLeadsQ.eq('owner_id', user.id);   // ❌ column: owner_id → does not exist
```

**DB truth:** The leads table has `assigned_to` (uuid), **not** `owner_id`. Supabase will silently return an error or empty rows when filtering by a non-existent column. For `role='member'` users, follow-up counts, stale lead counts, and focus lead lists will be **always empty/wrong**.

**Impact:** Any non-admin CRM user sees a permanently broken dashboard with 0 follow-ups and 0 focus leads.

---

#### ❌ FAIL — `assignee_id` column does not exist in tasks table

**Code (page.tsx, lines 65, 68, 70, 144):**
```ts
overdueTasksQ = overdueTasksQ.eq('assignee_id', user.id);   // ❌
focusTasksQ   = focusTasksQ.eq('assignee_id', user.id);     // ❌
teamTasksQ    = teamTasksQ.eq('assignee_id', user.id);       // ❌
const uTasks  = teamTasksData.filter(t => t.assignee_id === u.id); // ❌
```

**DB truth:** The tasks table has `assigned_to` (uuid), **not** `assignee_id`. For `role='member'` users, all task counts and Team Pulse data will be wrong. The team pulse per-user task filter on line 144 also uses `assignee_id` — so even for `role='admin'`, team pulse will show 0 tasks per user.

---

#### ❌ FAIL — 'Active Leads' count not directly shown; pipeline value has currency issue

The dashboard shows **"Open Pipeline"** (sum of deal_values for non-won/non-lost leads) formatted as USD (`formatCurrency` uses `currency: 'USD'`) regardless of the lead's actual `currency` field. All amounts are blended and displayed in USD. The DB has a `currency` column per lead — multi-currency leads will be incorrectly summed as if all are USD.

---

#### ✅ PASS — Revenue figures come from invoices (`paid` invoices, `paid_at` field)

**Code (line 92):**
```ts
supabase.from('invoices').select('amount, paid_at').eq('status', 'paid').gte('paid_at', prevStart).lte('paid_at', end)
```
"Cash Collected" = sum of `paid` invoices within the period. This is correct.

---

#### ❌ FAIL — MRR calculation is wrong

**Code (lines 120-126):**
```ts
allInvoices.forEach(inv => {
  const val = Number(inv.amount) || 0;
  if (inv.status === 'unpaid') outstanding += val;
  if (inv.type === 'recurring') mrr += val;
});
```

**Bug:** MRR = sum of ALL invoices with `type='recurring'` regardless of status or date. This means:
1. **Draft/cancelled recurring invoices** are included in MRR
2. **All historical recurring invoices** (not just the current month) are summed
3. The result is not Monthly Recurring Revenue — it is lifetime sum of recurring invoice amounts

**DB check:** Invoice table has `type` values. Current data has 1 invoice of type `one-time`, so MRR shows $0 — bug not yet visible but will cause massive inflation once recurring invoices are added.

---

#### ❌ FAIL — Stale leads query uses hardcoded stage strings

**Code (page.tsx line 58):**
```ts
let staleLeadsQ = supabase.from('leads').select(...)
  .lt('updated_at', thirtyDaysAgo)
  .not('stage', 'eq', 'Won')
  .not('stage', 'eq', 'Lost')
```

**Bug:** Stage names `'Won'` and `'Lost'` are hardcoded. If stage names change (e.g., `'Deal Won'`, `'Closed Lost'`), stale leads will wrongly include won/lost deals. The correct approach is to join `pipeline_stages` and filter by `is_won=false AND is_lost=false`.

---

#### ✅ PASS — Period selector on dashboard works (functional logic)

`PeriodSelector` component:
- Updates `?period=` URL param
- Dashboard re-renders with new period dates via `getPeriodDates(period)`
- Supported values: `this_month`, `last_month`, `this_quarter`, `this_year`
- Default: `this_month`

**Minor bug:** Period selector only affects KPI cards (Cash Collected, Outstanding, MRR, Pipeline). The "Today's Focus" and "Team Pulse" sections always show today's data regardless of period. This is partially intentional but may confuse users who expect the full dashboard to respond to period changes.

---

## 5. Edge Cases

#### ✅ PASS — Analytics with 0 leads: no crash, shows 0/empty state

Code analysis confirms safe guards:
- `total > 0` guard for win rate
- `Math.max(..., 1)` guards in all chart computations
- Empty state text for source data (`"No source data yet."`) and lost reasons (`"No lost reasons recorded yet."`)

---

#### ❌ FAIL — Long UTM value (300 chars): DB accepts without truncation (unbounded columns)

**Test:** Sent 300-char `utm_source` and 300-char `utm_campaign` strings.

**Result:** 
```
HTTP: 201 — lead inserted successfully
DB: utm_source = 300 'x' characters (full value stored)
```

**DB schema:** `utm_source`, `utm_campaign`, and all other UTM fields are `text` type with **NO character limit** (`character_maximum_length: null`).

**Risk:** An attacker or buggy integration could insert UTM values of arbitrary length (megabytes). This could bloat the DB and slow queries. Recommend adding DB-level `CHECK (length(utm_source) <= 500)` or application-level validation.

---

#### ❌ FAIL — Lead moved from Won back to Negotiation: win count is based on current stage, correct in analytics but stale leads query is broken

**Code analysis (analytics page, line 91-105):**
```ts
const isWon = stages.find(st => st.name === l.stage)?.is_won
```
Win/lost status is determined by the **current stage** at query time. If a lead is moved from Won → Negotiation, it would correctly stop appearing in won counts on the analytics page.

**However:** The stale leads query in `page.tsx` line 58 uses hardcoded `.not('stage','eq','Won')` — so a lead moved back from Won to Negotiation (and not updated for 30 days) **will** correctly appear as stale. This part works.

**Real failure:** The `assigned_to`/`assignee_id` column bug (Bug #2 above) means the dashboard stale lead counts for `role='member'` users show ALL stale leads, not just their own, before filtering silently fails and returns wrong data.

---

## 6. Missing Features (BLOCKED — Not Implemented)

| Feature | Status | Notes |
|---|---|---|
| Revenue by service line report | **BLOCKED** | No such report exists. Service lines are counted (leads count) but revenue is not broken down by service line anywhere. |
| Profit by client | **BLOCKED** | No profit/margin concept exists in the schema or UI. No cost fields tracked. |
| Pipeline velocity report | **BLOCKED** | "Avg Deal Velocity" stat card exists (days from created→updated for won leads) but there is no velocity chart over time, no stage-to-stage velocity, no cohort analysis. |
| Lost reasons analytics | **PARTIALLY IMPLEMENTED** | `Lost Reason Breakdown` bar chart exists but only shows count per lost_reason value. No trend over time, no win rate comparison against lost reasons. |
| Region split report | **PARTIALLY IMPLEMENTED** | `Region Split` section exists with Bangladesh vs International bars. However: (a) all ingest leads have `region='international'` hardcoded (route.ts line 107), (b) only 2 regions are tracked (any others are ignored), (c) no date filter. |

---

## 7. Bug Register

| ID | Severity | File | Line(s) | Description |
|---|---|---|---|---|
| ANA-001 | **CRITICAL** | `page.tsx` | 65-71 | `owner_id` column doesn't exist in leads; `assignee_id` doesn't exist in tasks. Member-role dashboard is broken. |
| ANA-002 | **CRITICAL** | `page.tsx` | 144 | Team Pulse filters by `assignee_id` on tasks — column is `assigned_to`. All users show 0 tasks. |
| ANA-003 | **HIGH** | `route.ts` (ingest) | 149-152 | Notification stub never writes to `notifications` table. Priority leads get no alert. |
| ANA-004 | **HIGH** | `route.ts` (ingest) | 25-31 | API expects nested payload (`contact.full_name`) but parent audit instructions/documentation describe flat payload (`name`, `email`). Schema is undocumented. |
| ANA-005 | **HIGH** | `route.ts` (ingest) | 160-165 | Malformed JSON body returns 500. Should return 400. |
| ANA-006 | **HIGH** | `page.tsx` | 119-126 | MRR = sum of all recurring invoices regardless of status or period. Will grossly overstate MRR once real data exists. |
| ANA-007 | **MEDIUM** | `route.ts` (ingest) | 50 | Dedup returns HTTP 200 with `status:'duplicate_suppressed'`. Should return 409 Conflict. |
| ANA-008 | **MEDIUM** | `analytics/page.tsx` | 36-49 | Analytics page has no period/date filter. Fetches all leads all-time. No `PeriodSelector`. |
| ANA-009 | **MEDIUM** | `analytics/page.tsx` | 81 | Attribution only groups by `utm_source||source`. No campaign-level (`utm_campaign`) breakdown chart. |
| ANA-010 | **MEDIUM** | `analytics/page.tsx` | 68 | Service lines hardcoded to 3 values. Future service lines silently dropped. |
| ANA-011 | **MEDIUM** | `page.tsx` | 58 | Stale leads query hardcodes `'Won'` and `'Lost'` stage names instead of using `is_won/is_lost` flags. |
| ANA-012 | **MEDIUM** | `page.tsx` | 153 | Currency blending: all pipeline values displayed as USD regardless of per-lead `currency` field. |
| ANA-013 | **MEDIUM** | `route.ts` (ingest) | 107 | `region` is hardcoded to `'international'` for all ingest leads. Bangladesh leads will never appear in the Bangladesh region split. |
| ANA-014 | **LOW** | `analytics/page.tsx` | 108 | Win rate shows "0%" when no closed deals yet, instead of "No closed deals" empty state. Misleading. |
| ANA-015 | **LOW** | `leads` schema | UTM cols | UTM text columns have no length limit. 300-char+ values accepted without truncation. Risk of storage abuse. |
| ANA-016 | **LOW** | `page.tsx` | 167-168 | Period selector only affects KPI cards (Cash Collected, etc.), not "Today's Focus" or "Team Pulse" sections. May confuse users. |
| ANA-017 | **INFO** | CORS headers | line 7 | CORS allows header `x-crm-api-key` but the audit brief (and likely integrations) reference `x-api-key`. Header name should be documented clearly. |

---

## 8. Recommended Fixes Priority Order

1. **[P0] Fix `assigned_to`/`owner_id` bug** — rename references in `page.tsx` from `owner_id` → `assigned_to` and `assignee_id` → `assigned_to` for both leads and tasks queries.
2. **[P0] Implement notification write on lead ingest** — replace the `console.log` stub with an actual DB insert.
3. **[P1] Fix malformed JSON → 500** — wrap `req.json()` in try/catch, return 400.
4. **[P1] Fix MRR calculation** — filter by current month and `status='paid'`.
5. **[P1] Document API payload schema** — add OpenAPI/README describing the nested `contact`/`project_details`/`attribution` structure.
6. **[P2] Add period selector to Analytics page** — integrate `PeriodSelector` and add `created_at` date filter to the leads query.
7. **[P2] Fix dedup response code** — change 200 → 409.
8. **[P2] Fix hardcoded region** — derive region from contact data (e.g., phone prefix, country field) rather than hardcoding `'international'`.
9. **[P2] Fix stale leads query** — use `is_won/is_lost` stage flags instead of hardcoded names.
10. **[P3] Add UTM length validation** — `maxLength: 500` in application layer + DB check constraint.
11. **[P3] Add campaign-level attribution chart** — group by `utm_campaign` for drill-down.
12. **[P3] Make service lines dynamic** — derive from DB enum, don't hardcode.
