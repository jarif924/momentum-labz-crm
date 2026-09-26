# Momentum Labz CRM — Project Brief (Context Handoff)

**Purpose of this document:** Full state-of-the-project snapshot as of **2026-09-26**, written so a new Claude session can pick up development with zero prior context. This is an internal CRM, not a product for resale.

**Owner:** Fatin Istiak Jarif, solo founder of Momentum Labz (agency, Bangladesh-based, ~70% Bangladeshi / 30% international clients, three service lines: Tech Solutions, Web Development, Marketing).

**Repo path:** `/Users/apple/Disk 01/Client's & Works/Momentum Labz/momentum-labz-crm`
**Git:** single branch `main`, 3 commits, pushed to a GitHub remote. **13 files are currently untracked** (leftover one-off patch/fix scripts — see "Repo Hygiene" below).
**Deployment:** Live on Vercel, project `momentum-labz-crm` (org `jarif1760-3640s-projects`). Most recent production deploy was ~1 day old at time of writing. `vercel.json` defines a daily cron (`0 9 * * *`) hitting `/api/cron/reminders`.
**Local dev:** `npm run dev` → http://localhost:3000 (redirects to `/login`). Confirmed working.

---

## 1. Tech Stack

- **Framework:** Next.js 14.2.35, App Router, TypeScript (strict), all authenticated pages are `'use client'` components fetching data client-side in `useEffect` — there is essentially no server-side data fetching in the authenticated app.
- **Styling:** Tailwind CSS, custom design-token system (see §6).
- **Database/Auth:** Supabase (Postgres + Auth). Browser client via `@supabase/ssr` (`createBrowserClient`). The public Client Portal and the cron/ingest API routes bypass Supabase's client and talk to Postgres directly via the `pg` package (service-role level access), not through RLS.
- **Icons:** `lucide-react` only, stroke width 1.75.
- **Dependencies are clean:** `@supabase/ssr`, `@supabase/supabase-js`, `lucide-react`, `next`, `pg`, `react`/`react-dom`. **No charting library, no drag-and-drop library** — all Kanban boards (Leads, Tasks) use native HTML5 drag-and-drop (`draggable`, `onDragStart`/`onDrop`). All "charts" are CSS bar-height divs, not a charting lib. This matches the project's hard rule: *no new npm dependency without explicit permission* (see `GLOBAL_RULES.md`).
- **Hosting:** Vercel, with Vercel Cron for the reminders job.

---

## 2. Governing Rules (must read before making changes)

The file `GLOBAL_RULES.md` at repo root is binding and should be treated as a system prompt for any future Antigravity/Claude session working on this repo. Key points:

- **Visual law:** Design-system tokens only, zero hardcoded hex values, cards use 1px `neutral-100` border + `radius-lg` + no shadow at rest, `tabular-nums` on every number, Lucide icons only.
- **Stack/data law:** Next.js 14 App Router + Tailwind + Supabase + Lucide, TypeScript strict, **no new npm dependencies unless explicitly permitted**, every new table needs RLS enabled with the same `authenticated_all` policy pattern already in use, all mutations should be optimistic with rollback + error toast on failure (this is aspirational — see §5, error handling is currently inconsistent), every list page needs a skeleton loading state + empty state + error toast.
- **Never hardcode stage names** — Won/Lost detection must go through `pipeline_stages.is_won`/`is_lost`, ordering via `sort_order` only. (Note: the Dashboard currently violates this — see Known Issues.)
- **Never blend currencies** — BDT/USD/AUD must always be displayed separately, formatted via `Intl.NumberFormat`. (Note: also violated in a few places — see Known Issues.)
- **Additive only** — do not restyle/refactor/restructure existing pages unless a prompt specifically asks. New Settings features = new tabs in the existing Settings Hub, not new pages.
- **Definition of done:** every acceptance criterion must be verified in the running app AND in Supabase directly. If something can't be met, stop and report rather than improvising a substitute.

---

## 3. Product Vision / Why This Exists

Full context lives in `MomentumLabz_CRM_Implementation_Plan.md` (root) and `implementation_plan_02.md` (gap analysis). Summary:

- This is **not** a generic HubSpot-style CRM. The founder is currently the entire sales team: outreach, demo building, DMing, closing, and delivery all run through one person. The data model is built to mirror the actual manual workflow (Meta Ad Library scan → build unsolicited demo → send Loom → DM on Instagram → follow up), not a generic MQL/SQL funnel.
- Two client geographies with different needs: Bangladeshi clients (WhatsApp-first, BDT), international clients (email/Loom-first, USD/AUD, timezone-aware).
- Reasoning for building custom rather than buying (Folk/Attio/Pipedrive/HubSpot): cost, control, and matching the exact non-standard outreach motion.
- **Sequencing correction already made:** the original plan had "Client Portal" as Phase 1. It was correctly resequenced so **Projects** (the delivery layer) got built first, since a Won lead had nowhere to operationally live otherwise. This resequencing already happened — Projects and the Portal are both now built (see §4).

---

## 4. What's Actually Built (verified by reading every page/component file, not just planning docs)

### Navigation (`src/components/shell/Sidebar.tsx`)
Grouped nav: **Overview** (Dashboard) · **Sales** (Leads, Tasks & Follow-ups, Proposals) · **Finance** (Overview, Invoices, Expenses) · **Clients** (Contacts & Companies, Clients) · **Delivery** (Projects) · **Workspace** (Brainstorming, Settings) · **Reports** (Analytics).

### Auth (`src/app/(auth)/login`, `src/middleware.ts`)
Email+password and magic-link sign-in via Supabase Auth. Middleware protects all routes except `/login`, `/auth/callback`, `/api/leads/ingest`, `/api/cron`, `/api/debug-env`, `/portal`. There is a **dev bypass flag** `NEXT_PUBLIC_BYPASS_AUTH=true` that skips auth entirely — confirm this is unset in production env.

### Dashboard (`src/app/(app)/page.tsx`)
KPI cards (Total Leads, Open Tasks, Total Won Value), MRR widget (sums recurring invoices by currency), One-Time revenue widget, Pipeline Stages bar chart, Region Split (BD vs Intl), Service Lines breakdown, Follow-ups Today & Overdue, Recent Activity feed (last 5). No charting library — CSS bar heights. No error handling (Supabase errors are silently swallowed).

### Leads (`src/app/(app)/leads/*`)
The most built-out module.
- List view (Google-Sheet-style dense table) and Kanban view (dynamic columns from `pipeline_stages`, drag-to-change-stage via native HTML5 DnD).
- List columns: checkbox, Company Name, Service (chips), Running Meta Ads (dot), Niche, Demo Status (badge), Link (demo URL), Status, Contact Info, Follow-up Date, Actions.
- Bulk select + bulk tag action.
- Lead detail drawer (slide-over): "Next Action" follow-up box, quick info grid, custom fields (dynamic, admin-defined in Settings), services chips, linked proposals list, linked invoices list (with Print button), full activity timeline with add-note form.
- Add/Edit modal: contact/company select-or-create-inline, service_line/region/stage, source/channel, niche/demo_status, running_meta_ads checkbox, deal_value+currency, dynamic custom fields, tag multi-select, services multi-select.
- **Real, working business logic:** moving a lead to a Won stage auto-creates a `projects` row (and an auto-named placeholder company if the lead has none).
- Kanban column totals convert everything to BDT using **hardcoded FX rates** (`{USD:120, AUD:80, EUR:130, BDT:1}`) — static, not live.

### Tasks (`src/app/(app)/tasks/*`)
Three-persona view toggle: Developer (dense table), Creative (Kanban, native DnD, 4 columns To Do/In Progress/Review/Done), Founder (roll-ups of blockers/decisions from `task_comments`). Task modal: type (feature/bug/content), DRI name (free text, not linked to a real user), Loom URL, checklist, status/priority/due date/project/lead/labels, and three client-facing flags (Client Visible / Needs Approval / Out of Scope) that feed directly into the Client Portal.

### Proposals (`src/app/(app)/proposals/page.tsx`)
Stat cards (Sent/Accepted/Drafts), table with services chips and status badges, create/edit modal (lead, amount+currency, services, status, external `document_url`, notes). **This is a status-tracker only** — it does not use the line-item/tax system that the public proposal view and invoicing actually depend on (see Known Issues #4).

### Contacts & Companies (`src/app/(app)/contacts/page.tsx`)
Tabbed CRUD for both entities. Straightforward, no known issues.

### Clients (`src/app/(app)/clients/page.tsx`)
Read-only card grid of contacts flagged `is_client=true`, with LTV rollup computed from Won deal values. "Client" status is toggled from the Contacts page, not here.

### Projects (`src/app/(app)/projects/*`)
List page (card grid, status badges: planning/blocked/active/review/completed/retained) + detail page. Detail page has a working "Copy Client Portal Link" / "View Portal" action, and a milestone list (the project's tasks) with toggle switches for `is_client_visible` and `requires_client_approval` — this is fully functional and wired correctly to the Portal.

### Finance module (`src/app/(app)/finances`, `/invoices`, `/expenses`)
- **Finances overview:** revenue-by-currency cards, Outstanding/Overdue/MRR/Pipeline row, recent activity (merged invoices+expenses), expense breakdown by category.
- **Invoices:** full CRUD with dynamic line items, tax/discount calc with live preview, auto invoice numbering (`ML-{year}-{seq}`), status filters, retainer flag, payment gateway select, Print button.
- **Expenses:** full CRUD, category filters, optional lead linkage, "billable to client" flag (captured but not used downstream).

### Analytics (`src/app/(app)/analytics/page.tsx`)
Computed entirely client-side from `leads` + `pipeline_stages` (does not touch invoices/finance data despite the name). Win rate, avg deal velocity, active pipeline count, top acquisition channels, pipeline distribution funnel, lost-reason breakdown (this last chart will likely always be empty — see Known Issues #1).

### Settings (`src/app/(app)/settings/page.tsx`)
4 tabs: Pipeline Stages (add/delete, toggle is_won/is_lost — **reordering via drag handle is decorative, not wired up**), Services list, Custom Fields (name+type, Text or Link only), Team Members (adds rows to a `users` directory table — **does not create real Supabase Auth accounts**, so "adding a team member" here does not grant them login access).

### Brainstorming (`src/app/(app)/brainstorming/page.tsx`)
Notion-style two-pane notes app (list + editor), autosave on blur, status field (idea/in_progress/done/archived). Fully functional, most recently added feature (last commit). Backed by the `brainstorm_notes` table.

### Client Portal (`src/app/portal/[id]/page.tsx`, unauthenticated, public by unguessable UUID)
Server-rendered, queries Postgres directly via `pg` (not Supabase RLS — access control is "the URL is unguessable"). Shows project status, an ROI widget (ad spend/leads generated — **these fields have no CRM UI to set them, DB-admin-only currently**), a Payment & Billing card whose pay buttons **have no click handler (non-functional placeholder)**, milestone timeline with Loom embed support, and an Approve button for client-approvable tasks (hits `/api/portal/[project_id]/approve/[task_id]`, which has **no auth beyond the URL itself**).

### Public Proposal View (`src/app/proposal/[id]/page.tsx`)
Server component using the Supabase service-role client to bypass RLS. Renders line items + signature capture + Accept button. Accept flow (`/api/proposal/[id]/accept`) moves the lead to Won and auto-creates a draft invoice.

### API Routes
- `POST /api/leads/ingest` — public webhook for the marketing website, API-key auth (`x-crm-api-key` vs `CRM_INGEST_API_KEY`), 60s dedup window, full UTM/click-ID attribution capture, lead scoring (budget tier + timeline + data completeness → 0–100), auto-tags PRIORITY_LEAD/STANDARD_LEAD/LOW_INTENT. **Slack/WhatsApp notification is a console.log stub only — no real integration exists yet.**
- `POST /api/proposal/[id]/accept` — accept flow described above.
- `POST /api/portal/[project_id]/approve/[task_id]` — client-side milestone approval.
- `GET /api/cron/reminders` — bearer-token-guarded (`CRON_SECRET`), runs daily via Vercel Cron: flags overdue invoices and stale leads (7+ days untouched) into an internal `notifications` table. No actual email/Slack delivery yet.

### Print/Invoice PDF (`src/app/print/invoices/[id]/page.tsx`)
Browser print-to-PDF (`window.print()` after 500ms), not a real PDF library. **Ignores the itemized `line_items` array** — shows only a single lump-sum line, no tax/discount breakdown despite those fields existing on the invoice.

---

## 5. Known Bugs / Half-Built Features (found by direct code reading — not yet fixed)

1. **Lost Reason capture is dead code.** `leads/page.tsx` declares and sets `lostReasonModalOpen`/`lostReasonLeadId`/`lostReason` state when a lead moves to a Lost stage, but no modal is ever rendered to consume it. Net effect: `lead.lost_reason` is essentially never populated, so the Analytics "Lost Reason Breakdown" chart will almost always be empty.
2. **Tasks: assignee/lead data is invisible.** `tasks/page.tsx` renders `<TaskModal>` without passing `leads` or `users` props (they default to `[]`), so the Assignee and Lead dropdowns in the task modal are always empty. Similarly, `TasksKanban.tsx` displays `task.users?.full_name` but the Supabase query backing it never joins `users`, so assignee names never render on cards.
3. **Founder task view is read-only.** The "Active Blockers" / "Recent Key Decisions" roll-up queries `task_comments` for `is_blocker`/`is_decision` flags, but there is no UI anywhere to create a `task_comment` with those flags — the feature has no way to ever populate itself.
4. **Proposals are disconnected from their own line-item system.** The admin Proposals CRUD (`proposals/page.tsx`) never sets `line_items`, `tax_rate`, `discount_amount`, `title`, or `valid_until` — but the public-facing proposal view (`ClientProposalView.tsx`) is built entirely around rendering `line_items` and computing totals from tax/discount. Any proposal created today will show an **empty line-items table and $0 subtotal** on the client-facing page. The invoicing module has full line-item support; it looks like that pattern was designed for Proposals too but never wired up on the admin side.
5. **Settings → Pipeline Stages drag-to-reorder is decorative.** A `GripVertical` icon with `cursor-grab` styling exists but has no drag event handlers wired to it — `sort_order` cannot actually be changed by dragging.
6. **Client Portal "Pay with bKash/Stripe" button has no onClick handler.** Pure UI placeholder, non-functional.
7. **Currency handling is inconsistent** in a few places, which directly conflicts with `GLOBAL_RULES.md`'s "never blend currencies" law:
   - Leads Kanban converts everything to BDT using hardcoded/static FX rates for column totals.
   - Finances overview's Outstanding/Overdue cards only ever display the BDT bucket, silently ignoring USD/AUD outstanding amounts.
8. **`invoice.type` string mismatch:** the Invoices page and Dashboard MRR widget use `'one-time'` (hyphen), but the proposal-accept API route auto-creates invoices with `'one_time'` (underscore). Auto-created invoices from accepted proposals fall through both the "recurring" and "one-time" buckets on the Dashboard.
9. **Dashboard hardcodes pipeline stage names** (`['prospect_found','contacted','meeting_set','proposal_sent','negotiation','Won','Lost']`) for its bar chart instead of reading from the `pipeline_stages` table — will silently drift if stages are edited in Settings, and directly violates the "never hardcode stage names" rule in `GLOBAL_RULES.md`.
10. **Print invoice view ignores itemized line items** — always shows one lump-sum line (`"{type} Services"`), no tax/discount breakdown, even though those fields exist and are used in the Invoices admin UI.
11. **Team Members in Settings ≠ real accounts.** Adding a "team member" only inserts a row into the `users` directory table with `crypto.randomUUID()` — it does not create a Supabase Auth account or send an invite, so they cannot actually log in.
12. **Finance's Expense Breakdown chart is missing a category.** The Expenses page's category list includes `domain_hosting`, but the Finance overview's breakdown array doesn't include it — those expenses count toward the total but never render their own bar.
13. **Portal Approve endpoint has no auth beyond URL obscurity.** Anyone with a project's portal link can hit the approve endpoint for any client-approvable task on that project — acceptable for a "magic link" model, but worth being deliberate about if this ever needs tightening.
14. **`src/types/supabase.ts` is a stub** (`export type Database = any;`) — no generated types from the actual schema, so there's no compile-time safety on any Supabase query/response shape anywhere in the app.

None of the above are catastrophic — the app runs and the core Leads → Tasks → Projects → Portal flow works — but they should inform priority if picking this back up.

---

## 6. Design System (binding — see `momentumlabzz_CRM_Design_System_v1.0` for full spec)

Minimal, premium, black-and-white foundation with one restrained accent. Same visual family as Rexora/Niond/Uxerflow reference dashboards.

- **Neutral ramp:** `neutral-0` (#FFFFFF) → `neutral-900` (#1C1C1C, exact sampled logo ink). Never use pure `#000000`.
- **Accent:** Muted Gold `accent-500` (#C8A84B) — matches the live Momentum Labz website. An alternative "Signal Lime" (#C6F24E) token exists but is unused; don't mix both.
- **Semantic colors:** desaturated success/warning/danger/info pairs (bg + text tokens), not saturated Bootstrap colors.
- **Chart palette (max 3 series per chart):** neutral-900 primary → accent-500 secondary → neutral-300 tertiary. Split into two charts rather than adding a 4th series.
- **Typography:** Inter, `tabular-nums` mandatory on every numeric value. Scale: `display` 32px/600 (KPI hero numbers) → `h1` 24px → `h2` 18px → `h3` 15px → `body` 14px/400 → `body-medium` 14px/500 → `small` 13px → `micro` 11px/500 uppercase (table headers, badges, eyebrows, 0.04em letter-spacing).
- **Radius:** sm=6px, md=10px, lg=16px, full=999px. **Shadows:** extremely subtle, no heavy shadow on resting cards.
- **Motion:** 120–220ms ease-out transitions, except first chart draw (400–600ms).
- **Icons:** Lucide only, stroke width 1.75.

---

## 7. Database Schema (ground truth from migration files, not just the plan doc)

Base schema in `supabase/schema.sql`, incrementally extended by 9 numbered files in `supabase/migrations/` plus 3 ad-hoc `run_*_migration.js` scripts (finance, sales, notifications — these were **not** captured as numbered migration files, only as one-off Node scripts run directly against the DB with `pg`, so `supabase/migrations/` is not a fully complete history of the live schema).

**Core tables:** `users`, `companies`, `contacts`, `pipeline_stages`, `leads`, `activities`, `tasks`, `proposals`, `tags`, `lead_tags`, `system_settings`.

**Added later, by migration/script:**
- `leads`: `custom_fields` (jsonb), `service_line` (enum), full UTM/click-ID columns (`utm_source/medium/campaign/term/content`, `gclid`, `fbclid`, `fbp`, `fbc`, `ttclid`, `click_id`), `lead_score`, `budget_tier`, `timeline`, `landing_page`, `submission_url`, `raw_payload` (jsonb), `referrer_url`, `client_ip`, `niche`, `demo_status`, `running_meta_ads`, `next_action_type/date/notes`.
- `system_settings`: `lead_custom_fields` (jsonb, defaults to meta_ads/niche/demo_status/link).
- `projects` (new table): company/lead FK, name, `service_line`, `status` (enum: planning/blocked/active/review/completed/retained), budget+currency, start/target dates, repository/staging/production URLs. Also (per Portal code) `total_ad_spend`, `leads_generated`, `est_roi_value` columns exist but have no admin UI (see Known Issues #—Portal).
- `tasks`: `project_id` FK, `is_client_visible`, `requires_client_approval`, `is_out_of_scope`, `status` (text, Trello-style columns), `sort_order`, `description`, `priority` (enum), `labels` (text[]), `checklist` (jsonb).
- `invoices` (new table): lead/proposal/project FKs, `invoice_number` (unique), amount, currency, `type` (one-time/recurring), `status` (draft/sent/paid/overdue/cancelled), `gateway` (enum: stripe/bkash/nagad/bank_transfer/cash), `payment_reference`, due_date, paid_at. Extended later with `line_items` (jsonb), `tax_rate`, `discount_amount`, `notes`, `retainer_month`, `is_retainer`, `partial_paid`.
- `proposals`: extended with `line_items`, `valid_until`, `notes`, `title`, `discount_amount`, `tax_rate`, `sent_at`, `accepted_at`.
- `lead_stage_history` (new table): auto-logged via trigger on every insert/stage-change to `leads`.
- `expenses` (new table, via script not numbered migration): date, description, amount, currency, category, lead/project FK, vendor, payment_method, receipt_url, notes, `is_billable`, `is_billed`.
- `notifications` (new table, via script): title, message, type, is_read, link, user_id FK.
- `brainstorm_notes` (new table): title, content, status (idea/in_progress/done/archived), created_by, timestamps.

**RLS:** every table has `enable row level security` + a single `authenticated_all` policy (`auth.uid() is not null`) — this is intentionally permissive "solo owner" mode, not per-role restriction, consistent with `GLOBAL_RULES.md`.

**⚠️ Could not verify live schema during this session** — a `DATABASE_URL`-based connection attempt failed with `tenant/user postgres.mjvpdvopcxpthultrjpf not found`, suggesting the Supabase pooler credential in `.env.local` may be stale/rotated, or the project is paused. **Recommend verifying Supabase project status and credentials before running any new migration.**

---

## 8. Repo Hygiene / Security Notes (address before continuing)

- **13 untracked files** sit in the repo root: `fix_eslint_issues.js`, `fix_eslint_issues2.js`, `fix_lead_modal.js`, `fix_lead_modal2.js`, `fix_sidebar_import.js`, `patch_lead_drawer2.js`, `patch_lead_form2.js`, `patch_lead_ui.js`, `patch_leads_list.js`, `patch_proposals_db.mjs`, `patch_sidebar_brainstorming.js`, `rewrite_proposals.js`, `run_phase6.mjs`, plus `implementation_plan_04.md`. These are one-off Node scripts that already patched the source files they targeted (their effects are visible in the current `src/` tree) — they are **safe to delete**, not needed for future work. There are ~50 similar already-applied `fix_*.js`/`patch_*.js` scripts from earlier sessions still sitting in the repo root too (already committed in the initial commit) — worth a cleanup pass at some point, low priority.
- **Two of the untracked scripts contain a plaintext Supabase database password in the connection string** (`patch_proposals_db.mjs`, `run_phase6.mjs`). They are not committed to git (`.env*` and script files aren't gitignored by pattern, so double-check before ever running `git add -A`), but the password is sitting in cleartext on disk. Recommend rotating that DB password and never hardcoding connection strings in throwaway scripts again — use `process.env.DATABASE_URL` like the numbered migration runners do.
- `seed_users.js` also has a **hardcoded Supabase service-role JWT** in plaintext instead of reading it from env.
- `.env.local`, `.env.production.local`, `.env.vercel` are all properly gitignored (`.env*.local` and `.env*` patterns present) — no secrets have leaked into git history from this repo's own commits, as far as could be verified.
- `src/types/supabase.ts` is a stub (`export type Database = any`) — regenerating real types from the live schema (`supabase gen types typescript`) would materially improve safety on every query in the app.

---

## 9. Last Planning Document That Was Never Actioned

`implementation_plan_04.md` (untracked, sitting in repo root) is the most recent plan and ends with **two unanswered questions to the founder** — this is the natural resume point if no other priority is chosen:

1. Is it okay to add `niche`, `demo_status`, `running_meta_ads` columns to the DB for the spreadsheet-style Leads view? — **Already done** (these columns exist and are wired up in the Leads list/drawer/form; this part of the plan shipped even though the question was never formally answered).
2. Should Brainstorming look like a Notion-doc/wiki or a sticky-notes/freeform board? — **Answered implicitly**: a Notion-style two-pane notes list was built and shipped (see §4, Brainstorming).

The one part of plan_04 genuinely **not yet done**: a "premium redesign" pass on the Proposals modal/table specifically (wide two-column layout, richer typography) — current Proposals UI is functional but plain, and is also the module with the worst underlying data-model gap (§5 #4).

---

## 10. Suggested Priorities for a Fresh Session

Not prescriptive — just what the evidence points to:

1. **Fix the Proposals ↔ line-items disconnect** (§5 #4) — this is the single highest-impact bug since it silently breaks the client-facing proposal experience.
2. **Wire up the Lost Reason modal** (§5 #1) — quick fix, unblocks the Analytics "Lost Reason" chart which currently can never populate.
3. **Fix the Tasks assignee/lead prop-passing gap** (§5 #2) — likely a one-line fix in `tasks/page.tsx` (pass `leads`/`users` into `<TaskModal>` and join `users` in the Kanban query).
4. **Reconcile the `'one-time'` vs `'one_time'` string mismatch** (§5 #8) — pick one convention, fix both call sites.
5. **Verify Supabase project status / rotate the DB credential** (§7, §8) before running any further migrations — the connection attempt in this session failed outright.
6. Everything else in §5 is lower-urgency polish/completion work.

---

*This brief was generated by reading the actual source files, migration SQL, deployment state, and planning docs directly — not by summarizing prior chat history. If anything here conflicts with what you observe in the running app or live Supabase project, trust direct observation over this document; it's a snapshot as of 2026-09-26.*
