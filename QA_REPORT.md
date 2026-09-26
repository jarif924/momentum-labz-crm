# QA Report: Momentum Labz CRM

**Stage:** 1 (Reconnaissance). No application code was changed.
**Date:** 2026-09-26
**Files written this stage:** `QA_REPORT.md`, `.env.example` (placeholders only).
**Other side effects:** `npm ci` reinstalled `node_modules`. The local dev server I had started earlier was stopped first.

---

## 0. Headline: the premise of this QA pass is false

The brief says Phases 0 to 5 of `CRM_TEAM_UPGRADE_PLAN.md` were implemented in earlier sessions. **They were not.** What exists:

- **Git:** `main` has the same 3 commits as before the plan was written (`cc818fb`, `6116780`, `12cafbe`). No commits since.
- **Source:** since `PROJECT_BRIEF.md` was written (Sep 26 03:49), the only file under `src/` that changed is `src/types/supabase.ts`, and that change broke it (see QA-001).
- **Planning only:** five files, `phase1_migration_plan.md` to `phase5_migration_plan.md` (untracked, Sep 26 04:11 to 04:51), contain proposed SQL inside markdown. None of that SQL exists as a migration file, none was applied, and none of the matching UI exists.
- **Zero code hits** in `src/` or `supabase/` for any Phase 1 to 5 identifier: `assignee_id`, `get_user_role`, `inviteUserByEmail`, `my-work`, `project_members`, `user_costs`, `cost_rate`, `time_entries`, `attachments`, `project_templates`, `client_credentials`, `app_settings`, `fx_rates`, `resend`, `recharts`, `dnd-kit`, `workload`, `utilisation`.
- **None of the approved libraries is installed** (`@dnd-kit/core`, `recharts`, `@react-pdf/renderer`, Resend).
- **`CLAUDE_CODE_PROMPTS.md` does not exist** anywhere under the Momentum Labz folder.
- **Phase 0 bug fixes were not applied either.** All 7 bugs listed in plan section 4 are still in the code (section 1.5).

So most of Stages 2 to 3 as written (role-based permission matrix, time logging, credentials vault, comments, notifications, templates, retainer automation, and so on) would test features that do not exist. **Decision needed before Stage 2** (section 6).

---

## 1.1 Git state

| Item | Result |
|---|---|
| Branch | `main`, tracking `origin/main`, 0 ahead / 0 behind |
| Commits | 3 total: `12cafbe` Add brainstorming page and phase 6 migration · `6116780` Update leads/proposals UI and harden API auth · `cc818fb` Initial commit |
| Stashes | none |
| `pre-qa-audit` tag | **Does not exist.** No tags at all. |
| Remote | `github.com/jarif924/momentum-labz-crm`. **Publicly readable** (unauthenticated GitHub API returns 200). |

**Uncommitted modifications (17 tracked files):**
- 16 root scripts (`apply_migration_phase5.js`, `check_rpc.js`, `check_users_service.js`, `db.mjs`, `db_patch_portal.js`, `db_patch_tasks.js`, `patch_env.js`, `run_migration.js`, `seed_users.js`, `test_step2.mjs` to `test_step6.mjs`, `update.mjs`). Each diff replaces a **hardcoded DB connection string or service-role JWT** with `process.env.*`. The scrub is correct, but the **committed versions still contain the secrets, and they are in public git history** (QA-002).
- `src/types/supabase.ts` is corrupted (QA-001).
- `supabase/.temp/cli-latest` changed from v2.117.0 to v2.118.0 (CLI cache, harmless).

**Untracked files (22):** `PROJECT_BRIEF.md`, `QA_REPORT.md`, `.env.example`, `implementation_plan_04.md`, `phase1_migration_plan.md` to `phase5_migration_plan.md`, and 13 one-off scripts: `fix_eslint_issues.js`, `fix_eslint_issues2.js`, `fix_lead_modal.js`, `fix_lead_modal2.js`, `fix_sidebar_import.js`, `patch_lead_drawer2.js`, `patch_lead_form2.js`, `patch_lead_ui.js`, `patch_leads_list.js`, `patch_proposals_db.mjs`, `patch_sidebar_brainstorming.js`, `rewrite_proposals.js`, `run_phase6.mjs`. `patch_proposals_db.mjs` and `run_phase6.mjs` still contain a hardcoded DB connection string with password (for the old, now-deleted project).

Note: `.gitignore` has a blanket `.env*` rule, so `.env.example` and `.env.local.example` are ignored and **will never be committed** unless a `!.env.example` exception is added.

---

## 1.2 Build health

| Check | Result |
|---|---|
| `npm ci` | Pass (26s, 653 packages). Warnings: EBADENGINE (local Node is v26.8.1; one transitive dep wants 20/22/24), deprecated `eslint@8`, `glob@7/10`, `tar@7.5.7`, `inflight`, `rimraf@3`. |
| `npm audit` | **33 vulnerabilities: 2 critical, 19 high, 11 moderate, 1 low.** Critical: `next` (direct, runtime; fix needs major upgrade 14 to 16) and `tar` (via `vercel` CLI devDependency). Most highs are inside the `vercel` CLI devDependency (not shipped to users). `postcss` high comes through `next`. |
| `npm run build` | **FAILS.** `./src/types/supabase.ts 1:7 Parsing error: ';' expected.` |
| `npx tsc --noEmit` | **4 errors, all in `src/types/supabase.ts`** (TS1005 syntax). These hide any semantic errors. Re-run with that import remapped to the old `Database = any` stub (scratch config, not committed): **0 errors**. But `Database = any` disables type-checking on every Supabase query, so "0" means very little. |
| `npm run lint` | Exit 1. 1 error (the same parsing error). 4 warnings, all `react-hooks/exhaustive-deps` in `expenses/page.tsx:49`, `finances/page.tsx:47`, `invoices/page.tsx:57`, `tasks/page.tsx:28`. |
| Silenced lint | **56 `eslint-disable` comments in 28 files:** 34 × `no-explicit-any`, 19 × `react-hooks/exhaustive-deps`, 3 × `no-unused-vars`. Heaviest: `leads/page.tsx` (8), `settings/page.tsx` (5), `LeadFormModal.tsx` (4). |
| `src/types/supabase.ts` | **Worse than a stub.** The file now contains the Supabase CLI error JSON `{"_tag":"Error","error":{"code":"AccessTokenRequiredError",...}}`. Someone ran `supabase gen types ... > src/types/supabase.ts` while not logged in. This is **QA-001**. Real types cannot be generated until the new DB has a schema (1.3). |

Production impact: the live Vercel deploy was built from the committed file (the old stub), so production still builds. **The next deploy from this working tree will fail.**

---

## 1.3 Database truth: STOPPED, and here is why

`.env.local` was changed today (Sep 26 04:06) to point at a **new** Supabase project. The old project is gone (its hostname returns NXDOMAIN).

| Check | New project |
|---|---|
| DNS / Auth API | Reachable. `GET /auth/v1/health` returns 200. |
| `DATABASE_URL` in `.env.local` | **Not set.** I cannot run SQL, so I cannot list RLS policies, enums, triggers or functions. The Portal page, the portal approve route and the lead ingest route all require it and will fail locally. |
| Tables in `public` (via REST schema, service-role key) | **Zero.** No table, no view, no RPC function. No migration has been applied. |
| Auth users | 1 confirmed user (`a***@momentumlabz.com`), last sign-in 2026-09-25 22:08 UTC. |
| Storage buckets | None. |

**Consequence:** logging in works, but every page queries tables that do not exist. The comparison "live schema vs migration files" cannot be done, because the live schema is empty. What I *could* do is check whether the migration files alone would rebuild the schema the code needs. **They would not.**

### Schema that exists only in ad-hoc scripts, never in a numbered migration

If you apply `supabase/migrations/*` to the empty project, all of the following will be missing, and the pages that use them will break:

| Object | Only created by | Used by |
|---|---|---|
| `task_comments` table (`task_id, author_name, content, is_blocker, is_decision, created_at`) | `db_patch_tasks.js` | Tasks Founder view. **The script never enabled RLS on it.** In the old DB, anyone with the public anon key could read and write every comment. |
| `tasks.task_type, parent_id, dri_name` | `db_patch_tasks.js` | TaskModal, Tasks page |
| `tasks.loom_url` | `db_patch_portal.js` | TaskModal, Portal |
| `projects.total_ad_spend, leads_generated, est_roi_value` | `db_patch_portal.js` | Portal ROI widget |
| `expenses` table | `run_finance_migration.js` | Expenses, Finances |
| `invoices.line_items, tax_rate, discount_amount, notes, retainer_month, is_retainer, partial_paid` | `run_finance_migration.js` | Invoices, Print, Proposal accept |
| `proposals.line_items, valid_until, notes, title, discount_amount, tax_rate, sent_at, accepted_at` | `run_finance_migration.js` (+ `patch_proposals_db.mjs`) | Proposals, public proposal page, accept route |
| `leads.next_action_type/date/notes`, `activities.activity_type` | `run_sales_migration.js` | LeadDrawer |
| `notifications` table | `run_notifications_migration.js` | Cron, proposal accept |

Other schema observations from the files:
- `supabase/schema.sql` and `migrations/20240914000000_init.sql` are byte-identical (duplicate source of truth).
- `leads.stage` defaults to `'prospect_found'`, but the seed inserts stage names like `'Prospect Found'`. A lead inserted without an explicit stage lands in a stage that does not exist in `pipeline_stages` and will not appear on the Kanban.
- `invoice_type_type` enum is `('one-time', 'recurring')` (hyphen). See QA-006.
- Every existing table uses the single blanket policy `authenticated_all` (`auth.uid() is not null`). There are no role-based policies anywhere.

---

## 1.4 Environment

Env vars read by code under `src/`:

| Var | Read by | `.env.local` | Vercel Production |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | middleware, lib/supabase, every app page, proposal page, accept route, cron | set (new project) | set, 11 days old. Almost certainly still the **dead** project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same | set | set, 11 days old |
| `SUPABASE_SERVICE_ROLE_KEY` | `proposal/[id]/page.tsx`, `api/proposal/[id]/accept`, `api/cron/reminders` | set | **MISSING.** These three fall back to `''` and fail in prod |
| `DATABASE_URL` | `portal/[id]/page.tsx`, `api/portal/.../approve`, `api/leads/ingest` | **MISSING** | set, 11 days old (dead project) |
| `CRM_INGEST_API_KEY` | `api/leads/ingest` | **MISSING** (route fails closed: rejects all requests) | set |
| `CRON_SECRET` | `api/cron/reminders` | **MISSING** (route fails closed) | set, 1 day old |
| `NEXT_PUBLIC_BYPASS_AUTH` | middleware, `(app)/layout.tsx` | not set | **not set. Good.** |

- `NEXT_PUBLIC_BYPASS_AUTH` is not set in any env file or in Vercel Production. Only the code that reads it exists.
- `.env.production.local` still points at the dead project and holds `CRM_INGEST_API_KEY` and `DATABASE_URL`. It is local-only (gitignored) but stale and misleading.
- `.env` holds placeholder values (`placeholder.supabase.co`).
- **Created `.env.example`** with all 7 vars and placeholder values. It is currently gitignored (see 1.1).
- Middleware public allowlist contains `/api/debug-env`, but **no such route exists** in `src/`. Dead entry, harmless today; will remove in fix loop.
- Service-role key and `pg` are only used in server files (no `'use client'` file imports either). Good.

**Production status:** the live site at Vercel is very likely **fully down for login** (it points at the deleted Supabase project, which is exactly the "Failed to fetch" you saw locally before `.env.local` was updated).

---

## 1.5 Feature inventory

Source: `CRM_TEAM_UPGRADE_PLAN.md` sections 4 and 5, plus the five `phase*_migration_plan.md` files. `CLAUDE_CODE_PROMPTS.md` does not exist, so "phases B through G" could not be read. I mapped them to plan Phases 0 to 5.

Legend: BUILT · PARTIAL · STUBBED · MISSING. Nothing below is tested yet; the DB is empty.

### Phase 0: Stabilise

| Deliverable | Status | Evidence |
|---|---|---|
| Proposals admin writes `line_items`/tax/discount | MISSING | `proposals/page.tsx`: 0 occurrences of `line_items`. Public view `proposal/[id]/ClientProposalView.tsx` depends on them |
| TaskModal gets `leads`/`users`; Kanban joins `users` | MISSING | `tasks/page.tsx:149` renders `<TaskModal isOpen task projects onClose>` with no `leads`/`users` |
| Lost Reason modal rendered | MISSING, and worse than documented | `leads/page.tsx:77-81`: moving to a lost stage opens a modal that is never rendered, then `return`s. **The stage change never happens. Leads cannot be moved to Lost at all** |
| `'one-time'` vs `'one_time'` reconciled | MISSING, and worse than documented | `api/proposal/[id]/accept/route.ts:44` inserts `'one_time'`, which the DB enum rejects. See QA-006 |
| Dashboard reads stages from `pipeline_stages` | MISSING | `(app)/page.tsx:65` hardcoded list. 5 of its 7 names match no seeded stage |
| Print invoice shows line items | MISSING | `print/invoices/[id]/page.tsx`: 0 occurrences of `line_items` |
| Stage drag-to-reorder | STUBBED | `settings/page.tsx:106` `GripVertical` icon, no drag handlers |
| Secrets off disk / rotated | PARTIAL | Working tree scrubbed in 16 files; 2 untracked files still hold a DB password; secrets remain in public git history |
| Real Supabase types | MISSING (broken) | `src/types/supabase.ts` contains a CLI error |
| Untracked one-off scripts deleted | MISSING | 13 still present, plus ~50 committed ones |

### Phase 1: Multiplayer

| Deliverable | Status | Evidence |
|---|---|---|
| Invite creates real Auth user | MISSING | `settings/page.tsx` inserts `users` row with `crypto.randomUUID()`; no `inviteUserByEmail`/`admin.createUser` anywhere |
| Three roles admin/manager/member | MISSING | Schema check is still `('owner','admin','sales','viewer')`; no role logic in code |
| `tasks.assignee_id` FK | MISSING | 0 hits; `dri_name` free text still used |
| Per-role RLS | MISSING | Only `authenticated_all`; no `get_user_role()` |
| My Work landing page | MISSING | No `my-work` route |
| `is_active` / deactivate user | MISSING | 0 hits |

### Phase 2: Collaboration

| Deliverable | Status | Evidence |
|---|---|---|
| Task comments + @mentions + blocker/decision UI | PARTIAL | Founder view reads `task_comments` (`tasks/page.tsx`); no create UI, no mentions; table has no migration and no RLS |
| Notification bell (5 events) | PARTIAL | `notifications` written by cron and accept route only; no bell/UI; none of the 5 task events |
| File attachments (Storage) | MISSING | No bucket, no table, no `storage.from` |
| Project templates | MISSING | 0 hits |
| Workload view | MISSING | 0 hits |
| Recurring tasks, subtasks | MISSING / PARTIAL | `tasks.parent_id` exists only via ad-hoc script; no UI |

### Phase 3: Time and profit

| Deliverable | Status | Evidence |
|---|---|---|
| One-tap time logging / timer | MISSING | no `time_entries` |
| `cost_rate` per user (admin only) | MISSING | 0 hits |
| Project profitability card | MISSING | `projects/[id]/page.tsx` has no such card |
| Utilisation (admin/manager) | MISSING | 0 hits |

### Phase 4: Client operations

| Deliverable | Status | Evidence |
|---|---|---|
| Credentials vault (encrypted, access log) | MISSING | 0 hits |
| Revision rounds + limit | MISSING | 0 hits. Plan also references a `milestones` table that does not exist (milestones are `tasks`) |
| Portal Request Changes | MISSING | Only Approve exists (`PortalTaskApproveButton.tsx`) |
| Portal magic-link login | MISSING | `/portal` is in the public allowlist; access is by unguessable UUID only |
| Dead bKash/Stripe buttons wired or removed | STUBBED | `portal/[id]/page.tsx` button with no handler |
| ROI fields admin UI | MISSING | Portal renders them; no CRM input anywhere |

### Phase 5: Automation and reporting

| Deliverable | Status | Evidence |
|---|---|---|
| Retainer auto-invoicing | MISSING | `api/cron/reminders/route.ts` only writes reminder notifications |
| Reminders that deliver (email/WhatsApp) | STUBBED | Cron writes to `notifications` table only; no Resend, no WhatsApp |
| New-lead alert | STUBBED | `api/leads/ingest/route.ts` `console.log('[WEBHOOK STUB] ...')` |
| Weekly digest | MISSING | no route, no cron entry in `vercel.json` |
| Real reports (revenue by service line, profit by client, utilisation, velocity) | MISSING | `analytics/page.tsx` reads only `leads` + `pipeline_stages` |
| FX rates in Settings | MISSING | `leads/LeadsKanban.tsx:7` hardcoded `{USD:120, AUD:80, EUR:130, BDT:1}` |

**Totals: 0 BUILT · 4 PARTIAL · 4 STUBBED · 29 MISSING** (Phase 0 to 5 deliverables).

What *does* exist and works in principle (pre-plan features, untested against a real DB): Leads list/Kanban/drawer/form, Won auto-creates project (client-side only), Tasks 3 views, Proposals CRUD, public proposal page, Contacts/Companies, Clients LTV, Projects list/detail with portal-visibility toggles, Invoices with line items, Expenses, Finance overview, Analytics (leads only), Settings (4 tabs), Brainstorming, Client Portal (UUID link), lead ingest API with scoring and attribution, reminders cron.

---

## 2. Preliminary bug log (found during recon, not yet reproduced in a running app)

Logged now so nothing is lost. Stage 3 will reproduce and extend this list. Format: ID | severity | module | what is broken | evidence.

| ID | Sev | Module | What is broken | Evidence / suspected cause |
|---|---|---|---|---|
| QA-001 | P1 | build | Production build fails; types file contains CLI error JSON | `src/types/supabase.ts:1` |
| QA-002 | P0 | security | DB connection strings with password and a service-role JWT for the old project are in **public** git history | Committed versions of `db.mjs`, `run_migration.js`, `update.mjs`, `db_patch_*.js`, `test_step2-6.mjs`, `seed_users.js`, `check_rpc.js`, `check_users_service.js`, `apply_migration_phase5.js`, `patch_env.js` (commit `cc818fb`). Full history scan in Stage 5 |
| QA-003 | P0 | infra | Production points at a deleted Supabase project; login fails for everyone | Vercel env `NEXT_PUBLIC_SUPABASE_URL` 11 days old; old host NXDOMAIN |
| QA-004 | P0 | infra | Production lacks `SUPABASE_SERVICE_ROLE_KEY`; public proposal page, accept route and cron run with an empty key | `vercel env ls` |
| QA-005 | P0 | security | `task_comments` created with RLS disabled | `db_patch_tasks.js` (no `ENABLE ROW LEVEL SECURITY`) |
| QA-006 | P0 | proposals/finance | Client signs proposal, gets a 500. Proposal is already marked accepted and lead moved to `'Won'`, then invoice insert is rejected by the enum. No invoice, no project. Non-atomic | `api/proposal/[id]/accept/route.ts:22-55`; enum in `20240914000006_phase4_invoices.sql:15` |
| QA-007 | P0 | proposals | Public proposal shows empty line items and 0 subtotal because admin form never writes them | `proposals/page.tsx`, `ClientProposalView.tsx` |
| QA-008 | P1 | schema | Migrations folder cannot rebuild the schema the app needs (9 objects only in ad-hoc scripts) | Section 1.3 table |
| QA-009 | P1 | leads | Leads cannot be moved to a Lost stage at all | `leads/page.tsx:77-81` |
| QA-010 | P1 | proposals | Proposal accept moves lead to Won server-side but project auto-creation only runs in the Leads page client code, so accepted proposals never get a project | `accept/route.ts:33-35` vs `leads/page.tsx` |
| QA-011 | P1 | security/deps | `next@14.2.35` has a critical advisory; fix requires major upgrade | `npm audit` |
| QA-012 | P1 | tasks | Assignee and Lead dropdowns always empty; Kanban never shows assignee | `tasks/page.tsx:149`, Kanban query lacks `users` join |
| QA-013 | P2 | dashboard | Pipeline chart uses hardcoded stage names, 5 of 7 match nothing | `(app)/page.tsx:65` |
| QA-014 | P2 | rules | Stage names hardcoded as `'Won'` in 4 places (rule violation) | `(app)/page.tsx:61`, `clients/page.tsx:59`, `accept/route.ts:33-34` |
| QA-015 | P2 | finance | Print invoice ignores line items, tax, discount | `print/invoices/[id]/page.tsx` |
| QA-016 | P2 | leads | Hardcoded FX rates; currencies blended into BDT (rule violation) | `LeadsKanban.tsx:7` |
| QA-017 | P2 | schema | `leads.stage` default `'prospect_found'` matches no seeded stage | `20240914000000_init.sql:65` vs `..._seed.sql` |
| QA-018 | P2 | settings | Stage reorder handle is decorative | `settings/page.tsx:106` |
| QA-019 | P2 | portal | Pay with bKash/Stripe button has no handler (plan says P1 if visible and dead) | `portal/[id]/page.tsx` |
| QA-020 | P3 | middleware | `/api/debug-env` in public allowlist; route does not exist | `middleware.ts:46` |
| QA-021 | P3 | repo | `.env*` ignore rule also ignores `.env.example` | `.gitignore` |
| QA-022 | P3 | lint | 4 `exhaustive-deps` warnings; 56 `eslint-disable` comments | Section 1.2 |
| QA-023 | P1 | settings | Settings > Team Members > Add Member does nothing visible on failure. Reported by user. Root cause: the new DB has no `users` table (PGRST205), and `handleAdd` discarded the error; empty-field clicks were also silently ignored | `settings/page.tsx` `handleAdd` |

---

## Fix log

### Database (2026-09-26)
New Supabase project `loivivphqzedhutgxzcl` was empty. All 13 migrations were applied in one transaction via `DATABASE_URL` and recorded in `supabase_migrations.schema_migrations`: 18 tables, RLS on every table, 9 stages seeded. Signed-out visitors: reads return nothing, writes and RPCs return 401.

### Additional bugs found and fixed while connecting every area
| ID | Sev | Module | What was broken | Commit |
|---|---|---|---|---|
| QA-001 | P1 | build | types file held CLI error JSON (restored committed stub) | n/a (restored) |
| QA-005 | P0 | security | `task_comments` had no RLS | 62ad5d3 |
| QA-006 | P0 | proposals | client acceptance always failed (enum + missing invoice number), could double-invoice | 9a94dae |
| QA-008 | P1 | schema | migrations could not rebuild the app schema | 62ad5d3 |
| QA-009 | P1 | leads | leads could not be moved to Lost; Won never marked contact as client | 171f536 |
| QA-012 | P1 | tasks | task type/DRI/Loom not saved; assignee/lead lists empty; list vs board status out of sync | 39c6147 |
| QA-015 | P2 | print | invoice print ignored line items, tax, discount | 9cb61ca |
| QA-023 | P1 | settings | Add Member silent failure; members were not real logins | 97a91d3, 914098c |
| QA-024 | P1 | brainstorming | create/save/delete failed silently | f88d12b |
| QA-025 | P2 | contacts | silent failures; contact-with-leads delete gave no reason | 617610e |
| QA-026 | P1 | proposals | saving without a lead/amount crashed silently | b62b946 |
| QA-027 | P1 | invoices | invoice number collided after any delete | 7acc6d1 |
| QA-028 | P2 | expenses | silent failures | 335951b |
| QA-029 | P0 | leads | editing a lead or clicking a service wiped all its tags (data loss) | d9eec0c |
| QA-030 | P1 | leads | Demo/Follow Up completions rejected; action cleared anyway; stale drawer state | 5a2fab8 |
| QA-031 | P0 | auth | clients were redirected to CRM login from proposal links | b05d97f |
| QA-032 | P1 | portal | approved milestones vanished from the Tasks board (`done` vs `Done`) | 804170e |
| QA-033 | P1 | cron | Next.js fetch cache made reminders stale and duplicated | 6dbc0fd |
| QA-034 | P2 | notifications | bell never updated live (publication + anonymous join) | 995b80f |
| n/a | P3 | app | favicon 404; print nested html/body; duplicate sidebar key; mobile stage names hidden | 509151f, ee6f40c, f88d12b, 5abed4a |

### Settings rebuild
All 10 sections built and wired end to end (see `SETTINGS_PLAN.md`): Company profile, Team, My account, Pipeline (+ lost reasons), Lead sources, Services, Custom fields, Tags, Currency & FX, Invoicing. Commits a39ff80 … 5abed4a.

### Verification
Browser automation (puppeteer-core in scratch, not a project dependency) against the live database, 168 checks across 12 suites, plus a zero-error sweep of 22 page views. Production `npm run build` passes (only the 4 pre-existing `exhaustive-deps` warnings). All test data and the temporary QA login were removed afterwards. Not reproduced: one Team password-reset check failed once at the end of a back-to-back run of all suites (~40 test sign-ins in minutes, likely Supabase auth rate limiting); it passed 3/3 when run alone.

### Earlier entries
| ID | Status | What changed | Verified |
|---|---|---|---|
| QA-023 | FIXED (code) | `handleAdd` now shows the database error inline, shows a message when name/email is empty, and disables the button while saving | `tsc` (with types stub) and `eslint` pass on the file. The underlying cause is QA-008: adding a member will succeed only after the schema is applied. Still true after this fix: a member added here is a directory row, **not a login** (Phase 1 item, not built) |
| QA-008 | FIXED (migration written, not yet applied) | New `supabase/migrations/20260926000000_capture_adhoc_schema.sql` captures everything the ad-hoc scripts created, and enables RLS + `authenticated_all` on `task_comments` (QA-005) | All 10 migrations applied in order to an empty in-memory Postgres (PGlite; `pgcrypto` line skipped since `gen_random_uuid` is core): 18 tables created, every table has RLS, 9 stages seeded, new migration re-runs cleanly. **Not applied to Supabase yet: needs `DATABASE_URL`** |

Previously reported items not yet re-verified (from `PROJECT_BRIEF.md`, treated as claims): Finance Outstanding/Overdue BDT-only, `domain_hosting` missing from breakdown, Team Members not creating Auth users, portal approve endpoint unauthenticated. Stage 3 will verify.

---

## 6. Decisions I need from you before Stage 2

1. **What are we QA-ing?** Phases 1 to 5 do not exist. Options:
   - **(a)** QA and fix the app **as it actually is** (pre-plan CRM plus Phase 0 bug fixes). Stage 3 sections on roles, comments, time, vault, templates, retainers, digests become "NOT BUILT" rows in the final report.
   - **(b)** Stop QA and build Phase 0 then Phase 1 first. That is feature work, which your ground rules say needs your explicit go-ahead.
   My recommendation is (a) first: it gets a working, safe app back online. Then build Phase 1 as a separate effort.

2. **Database.** The new project is empty and I have no `DATABASE_URL`. I need:
   - the transaction-pooler connection string added to `.env.local` as `DATABASE_URL` (I will not print it);
   - confirmation this new project is a **non-production / test** project I may apply migrations and seed data to;
   - approval to write **one consolidating numbered migration** that captures everything currently only in ad-hoc scripts (section 1.3), including enabling RLS on `task_comments`.
   - Is there any old data you need back? The old project is deleted, so nothing is recoverable from it by me.

3. **Spec contradiction, invoice type.** Your QA brief says accepted proposals should create `type 'one_time'`. The DB enum and all three UI call sites use `'one-time'`. Which one is canonical? Using `'one-time'` means changing one line in the accept route. Using `'one_time'` means an enum migration plus 3 UI changes plus rewriting existing rows.

4. **`next` critical vulnerability.** The only fix is Next 14 to 16, a major upgrade that touches middleware, route handler params and caching. That is well beyond "fix, don't redesign". Upgrade now, defer, or check for a patched 14.x/15.x line first?

5. **Secrets in public git history (you must act).** The exposed credentials belong to the deleted project, so they are dead. But: (i) if that DB password is reused anywhere else, rotate it there; (ii) consider making the GitHub repo private; (iii) rewriting history is destructive and needs your say-so. I will do a full `git log -p` scan in Stage 5.

6. **Housekeeping approvals.** May I (i) create the `pre-qa-audit` tag on the current `HEAD` (`12cafbe`) now, (ii) commit the 16-file secret scrub that is sitting uncommitted, (iii) add `!.env.example` to `.gitignore`?

7. **Production.** Prod is down. Fixing it needs new env values in Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`), which you must set, plus the schema applied to whichever project becomes production. Which Supabase project should production use?

Stopping here for your review.
