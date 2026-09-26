# MASTER_BUGS.md — Momentum Labz CRM Pre-Launch Audit
**Audit Date:** 2026-09-26  
**All 9 Specialist Auditors:** ✅ Complete  
**Stage:** 2 — Triage Complete. **Awaiting your approval to begin Stage 3 fixes.**

---

## TOTAL BUG COUNT

| Severity | Count |
|---|---|
| **P0 — Critical (ship blocker)** | **8** |
| **P1 — High (workflow broken)** | **13** |
| **P2 — Medium (degraded/wrong)** | **18** |
| **P3 — Low (cosmetic/polish)** | **10** |
| **GRAND TOTAL** | **49** |

---

## ⛔ P0 — CRITICAL (Must fix before ANY user touches this system)

| ID | Module | Title | File:Line | Auditor |
|---|---|---|---|---|
| **P0-01** | Finance | **Finance page blends multi-currency totals** — pipeline value and total expenses sum BDT+USD+AUD as one number. Shows false financial data. | `finances/page.tsx:30,68` | Finance, UI, E2E |
| **P0-02** | Finance | **Invoice list "Total Outstanding" blends currencies** — 100 USD + 100 BDT = `৳200`. Wrong money. | `invoices/page.tsx` | Finance |
| **P0-03** | Finance | **Finance overview shows BDT-only stats** — USD and AUD outstanding/overdue invoices completely invisible to founder. | `finances/page.tsx:126,133` | Finance, E2E |
| **P0-04** | Proposals | **Proposal admin form has NO line items editor** — only a lump-sum `amount` field. Client sees a blank itemised table on their proposal link. Core sales flow broken. | `proposals/page.tsx:261` | Sales, E2E |
| **P0-05** | Public page | **`/proposal/[id]` returns 500 to all clients** — vendor chunk cache miss. The most important external link is broken. | `.next/` cache | Security, Portal |
| **P0-06** | Dashboard | **Dashboard uses wrong column names** — queries `owner_id` (doesn't exist, should be `assigned_to`) on leads and `assignee_id` (doesn't exist) on tasks. Every non-admin user sees a permanently broken dashboard with 0 follow-ups, 0 focus leads, 0 tasks. | `page.tsx:65-71,144` | Analytics |
| **P0-07** | Security | **Portal task-approve API is fully unauthenticated** — `POST /api/portal/[project_id]/approve/[task_id]` has zero auth check. Anyone who knows the URL can approve client milestones. | `api/portal/.../route.ts` | Portal |
| **P0-08** | Security | **Internal columns sent to client browser in portal** — `SELECT *` on tasks exposes `priority`, `dri_name`, `assigned_to`, `is_out_of_scope`, `lead_id`, internal labels; `SELECT p.*` on projects exposes `budget`. Data leak to unauthenticated clients. | `portal/[id]/page.tsx` | Portal |

---

## 🔴 P1 — HIGH (Core workflows blocked)

| ID | Module | Title | File:Line | Auditor |
|---|---|---|---|---|
| **P1-01** | Finance | **Paid invoices can be freely edited** — no lock. Admin can change amounts after payment. Accounting integrity broken. | `invoices/page.tsx` | Finance, E2E |
| **P1-02** | Finance | **MRR calculation wrong** — sums ALL recurring invoices ever (any status, any date). Will massively overstate MRR once retainers are live. | `page.tsx:119-126` | Analytics |
| **P1-03** | Finance | **Clients LTV from deal_value not paid invoices** — wrong metric, blends currencies arbitrarily. | `clients/page.tsx:57-60` | Settings, E2E |
| **P1-04** | Analytics | **Priority lead ingest notification is a stub** — `console.log` only, nothing written to `notifications` table. Admin never alerted about a 90-score lead. | `api/leads/ingest/route.ts:149` | Analytics |
| **P1-05** | Analytics | **Malformed JSON to ingest API returns 500** — client error should be 400. | `api/leads/ingest/route.ts:160` | Analytics, Security |
| **P1-06** | Leads | **No search or filter on leads page** — unusable with even 20+ leads. No search bar exists. | `leads/page.tsx` | Sales |
| **P1-07** | Security | **Lead ingest API header name undocumented** — code reads `x-crm-api-key`, every external integration document and curl example uses `x-api-key`. Any new integrator gets 401. | `api/leads/ingest/route.ts:18` | Security, Analytics |
| **P1-08** | Tasks | **Task comments UI completely missing** — `task_comments` table exists in DB but TaskModal has no comment section. Core team collaboration feature absent. | `tasks/TaskModal.tsx` | Operations |
| **P1-09** | Projects | **No manual project creation** — projects only auto-created from Won leads. Cannot create for retainer work or internal projects. | `projects/page.tsx` | Operations |
| **P1-10** | Projects | **Project status is static, uneditable** — no dropdown. Status stuck at creation value forever. | `projects/[id]/page.tsx:80` | Operations |
| **P1-11** | Settings | **Global search (Topbar) is completely stubbed** — input has no `onChange`, no results, no functionality. | `Topbar.tsx:94-100` | Settings |
| **P1-12** | Portal | **Print invoice (`/print/invoices/[id]`) is behind CRM login** — clients redirected to `/login`. Cannot share invoice link. | `middleware.ts` | Portal |
| **P1-13** | Finance | **Overdue status never auto-set** — must be changed manually. No cron or automation. | `api/cron/reminders/route.ts` | Finance |

---

## 🟡 P2 — MEDIUM (Works but wrong / significantly degraded)

| ID | Module | Title | File:Line | Auditor |
|---|---|---|---|---|
| **P2-01** | Finance | **BDT format wrong** — `en-BD` locale gives `450,000` not `4,50,000` (lakh). Unprofessional to Bangladeshi clients. | `invoices/page.tsx:27` | Finance |
| **P2-02** | Finance | **Tax applied to pre-discount subtotal** — formula is `subtotal + tax - discount` instead of `(subtotal - discount) + tax`. Every invoice with both tax + discount calculates incorrectly. | `invoices/page.tsx` | Finance |
| **P2-03** | Finance | **Invoice number reuse on delete** — deleting the highest-numbered invoice causes that number to be reused. | `invoices/page.tsx:16-22` | Finance |
| **P2-04** | Finance | **Race condition on rapid invoice creation** — user gets cryptic DB unique-violation error instead of auto-retry. | `invoices/page.tsx` | Finance |
| **P2-05** | Finance | **Currency switch mid-form doesn't reset amounts** — 500 BDT becomes 500 USD silently. | `invoices/page.tsx` | Finance |
| **P2-06** | Leads | **Kanban column totals blend currencies** — all deal values converted to BDT. GLOBAL_RULES violation. | `LeadsKanban.tsx:50` | Sales |
| **P2-07** | Leads | **No delete lead button** — no way to remove a mistakenly created lead from any view. | `LeadsList.tsx`, `leads/page.tsx` | Sales |
| **P2-08** | Proposals | **Client signature validation mismatch** — frontend allows 1-char, backend requires 2+. Client gets confusing API error after submitting. | `ClientProposalView.tsx:20` | E2E, Portal |
| **P2-09** | Analytics | **Dashboard pipeline value blends currencies as USD** — all leads summed in USD regardless of currency field. | `page.tsx:153` | Analytics |
| **P2-10** | Analytics | **Stale leads query uses hardcoded stage names** — `.not('stage','eq','Won')` breaks if stage is renamed. Should use `is_won/is_lost` flags. | `page.tsx:58` | Analytics |
| **P2-11** | Analytics | **Analytics page has no period/date filter** — fetches all leads all-time. Performance problem as data grows. | `analytics/page.tsx` | Analytics |
| **P2-12** | Analytics | **Service lines hardcoded to 3 values** — any new service line silently dropped from analytics. | `analytics/page.tsx:68` | Analytics |
| **P2-13** | Analytics | **Ingest API hardcodes `region='international'`** — Bangladesh leads never appear in the BD region split chart. | `api/leads/ingest/route.ts:107` | Analytics |
| **P2-14** | Analytics | **Dedup returns 200 not 409** — naive callers (Zapier/Make) cannot distinguish duplicate from successful create. | `api/leads/ingest/route.ts:50` | Analytics |
| **P2-15** | Settings | **Company logo upload missing** — no field in Company Profile. Cannot brand invoices. | `FormSections.tsx:73` | Settings |
| **P2-16** | Portal | **`repository_url` mislabeled as "Figma / Assets"** on client portal. Wrong label confuses clients. | `portal/[id]/page.tsx` | Portal |
| **P2-17** | Portal | **`production_url` never rendered** — in guard condition but no matching UI card. Client can't see their site link. | `portal/[id]/page.tsx` | Portal |
| **P2-18** | UI | **Missing loading skeletons on every page** — all pages show blank/pulsing text while loading. Dashboard has no loading state at all. | All pages | UI |

---

## 🔵 P3 — LOW (Cosmetic / Polish)

| ID | Module | Title | File:Line | Auditor |
|---|---|---|---|---|
| **P3-01** | Security | **Secrets in public git history** — old DB password (dead project) in public repo history. Repo is public. | `git log` | Security |
| **P3-02** | UI | **Hardcoded hex color `bg-[#FDFDFD]`** on portal page. GLOBAL_RULES violation. | `portal/[id]/page.tsx:53` | UI |
| **P3-03** | UI | **Table header style inconsistency** — some pages uppercase+tracking-wider, others normal case. | `LeadsList.tsx`, `tasks/page.tsx` | UI |
| **P3-04** | UI | **`tabular-nums` missing on currency displays** — GLOBAL_RULES violation on Kanban totals. | `LeadsKanban.tsx:51` | UI |
| **P3-05** | UI | **Empty state component used inconsistently** — Settings uses `<EmptyState>`, all other pages use ad-hoc text. | Multiple pages | UI |
| **P3-06** | Operations | **Notification bell shows dot, not number count** — only a red dot, no numeric badge. | `Topbar.tsx:112` | Operations |
| **P3-07** | Operations | **Kanban card text overflow on long names** — no `truncate` or `line-clamp`. Long company names break card layout. | `LeadsKanban.tsx:72` | Sales, Operations |
| **P3-08** | Operations | **Tasks due today not highlighted** — overdue = red highlight, but "due today" has no indicator. | `TasksKanban.tsx:95` | Operations |
| **P3-09** | Portal | **Timeline dot uses `task.completed` boolean** not `task.status === 'Done'`. Status mismatch. | `portal/[id]/page.tsx` | Portal |
| **P3-10** | Repo | **30+ one-off patch scripts at repo root** — dirty project. Should be cleaned up before launch. | `/` | Lead |

---

## 🚫 MISSING FEATURES (out of scope for this fix sprint — documenting for roadmap)

| Feature | Notes |
|---|---|
| Time logging | No UI, no table |
| My Work / `/my-work` page | Route doesn't exist |
| Workload view | Not built |
| Task file attachments | No storage bucket, no UI |
| Revenue by service line | Analytics shows lead counts only, not revenue |
| Project profitability (revenue - expenses) | No cost tracking per project |
| Portal "Request Changes" button | Clients can only approve, not push back |
| Portal magic-link login | Access by guessable UUID only |
| Retainer auto-invoicing cron | Manual only |
| Expense linked to specific project | All expenses are global |
| UTM campaign-level analytics | Only source-level breakdown exists |
| `production_url` display on portal | In code guard but not rendered |

---

## 5 DECISIONS NEEDED BEFORE FIXES BEGIN

> [!CAUTION]
> **D-01: Tax calculation order** — Current formula: `subtotal + (subtotal × tax%) - flat_discount`. Correct standard: `(subtotal - flat_discount) + ((subtotal - flat_discount) × tax%)`. Fixing this changes totals on any invoice that has BOTH tax AND a discount. Shall I fix it? **YES / NO**

> [!IMPORTANT]
> **D-02: Proposal line items UI (P0-04)** — This is the biggest rebuild. The admin proposals modal needs a full line-item editor (add rows, description/qty/price, subtotal preview, discount, tax). Backend already supports it. Shall I build it? **YES / NO**

> [!NOTE]
> **D-03: Overdue auto-marking** — Add logic to the existing reminders cron to auto-set invoice status to `overdue` when `due_date < today AND status IN ('draft','sent')`? **YES / NO**

> [!NOTE]
> **D-04: BDT lakh format** — Change `'en-BD'` → `'en-IN'` in the `fmt()` function everywhere to get `৳4,50,000` instead of `৳450,000`. One-line fix, zero risk. **YES (recommended) / NO**

> [!IMPORTANT]
> **D-05: Portal approve API security (P0-07)** — The `/api/portal/[project_id]/approve/[task_id]` endpoint has zero authentication. Currently any URL-knower can approve milestones. The simplest fix is to verify the project_id actually exists and the task belongs to that project (no new auth layer needed). Shall I add this validation? **YES / NO**

---

*Once you answer these 5 questions, I will begin Stage 3 fixes: P0s first, one commit per bug, no big-bang commits.*
