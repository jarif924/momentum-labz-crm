# FEATURE MAP — Momentum Labz CRM
**Generated:** 2026-09-26 | **Auditor:** Lead (Antigravity)

---

## Routes

### App Shell (requires auth)
| Route | File | Description |
|---|---|---|
| `/` | `(app)/page.tsx` | Dashboard (KPIs, pipeline chart, recent activity) |
| `/leads` | `(app)/leads/page.tsx` + `LeadsList.tsx`, `LeadsKanban.tsx`, `LeadFormModal.tsx`, `LeadDrawer.tsx` | Leads list/kanban, add/edit/delete lead, drawer |
| `/tasks` | `(app)/tasks/page.tsx` + `TaskModal.tsx`, `TasksKanban.tsx` | Tasks list/kanban/founder view, task modal |
| `/proposals` | `(app)/proposals/page.tsx` | Proposals CRUD, quick stats |
| `/invoices` | `(app)/invoices/page.tsx` | Invoices CRUD, line items, tax/discount |
| `/finances` | `(app)/finances/page.tsx` | Finance overview — outstanding/overdue |
| `/expenses` | `(app)/expenses/page.tsx` | Expenses CRUD |
| `/contacts` | `(app)/contacts/page.tsx` | Contacts & Companies CRUD |
| `/clients` | `(app)/clients/page.tsx` | Clients list with LTV |
| `/projects` | `(app)/projects/page.tsx` | Projects list |
| `/projects/[id]` | `(app)/projects/[id]/page.tsx` | Project detail, portal toggles |
| `/analytics` | `(app)/analytics/page.tsx` | Analytics dashboard |
| `/settings` | `(app)/settings/page.tsx` + 6 component files | Settings hub (10 tabs) |
| `/brainstorming` | `(app)/brainstorming/page.tsx` | Notion-style brainstorming |

### Public / Client-facing (no CRM auth required)
| Route | File | Description |
|---|---|---|
| `/login` | `(auth)/login/page.tsx` | Login page |
| `/auth/callback` | `auth/callback/route.ts` | Supabase auth callback |
| `/portal/[id]` | `portal/[id]/page.tsx` | Client portal (by project UUID) |
| `/proposal/[id]` | `proposal/[id]/page.tsx` + `ClientProposalView.tsx` | Public proposal page |
| `/print/invoices/[id]` | `print/invoices/[id]/page.tsx` | Print-friendly invoice |

### API Routes
| Route | File | Auth | Description |
|---|---|---|---|
| `POST /api/proposal/[id]/accept` | `api/proposal/[id]/accept/route.ts` | None (public) | Accept a proposal, create invoice + project |
| `POST /api/leads/ingest` | `api/leads/ingest/route.ts` | `CRM_INGEST_API_KEY` header | External lead ingest with UTM/scoring |
| `POST /api/portal/[project_id]/approve/[task_id]` | `api/portal/.../route.ts` | None (public by UUID) | Client approves a task via portal |
| `GET /api/cron/reminders` | `api/cron/reminders/route.ts` | `CRON_SECRET` query param | Reminder cron job |
| `GET /api/team` | `api/team/route.ts` | Supabase session | List team members |
| `GET /api/team/me` | `api/team/me/route.ts` | Supabase session | Get current user profile |
| `POST /api/team/reset-password` | `api/team/reset-password/route.ts` | Supabase session | Send password reset email |

---

## Settings Tabs
| Tab | File | Description |
|---|---|---|
| Company Profile | `FormSections.tsx` | Agency name, email, phone, address, logo |
| Team Members | `PeopleSections.tsx` | Invite, role, deactivate |
| My Account | `PeopleSections.tsx` | Name, password |
| Pipeline | `PipelineSection.tsx` | Stages, lost reasons, lead sources |
| Services | `ListSections.tsx` | Service list |
| Custom Fields | `CustomFieldsSection.tsx` | Field types |
| Tags | `ListSections.tsx` | Lead tags |
| Currency & FX | `FormSections.tsx` | FX rates |
| Invoicing | `FormSections.tsx` | Invoice prefix, tax, terms |

---

## Key Components
| Component | Path | Used By |
|---|---|---|
| `LeadFormModal` | `leads/LeadFormModal.tsx` | Leads page |
| `LeadsKanban` | `leads/LeadsKanban.tsx` | Leads page |
| `LeadsList` | `leads/LeadsList.tsx` | Leads page |
| `LeadDrawer` | `leads/LeadDrawer.tsx` | Leads page |
| `TaskModal` | `tasks/TaskModal.tsx` | Tasks page |
| `TasksKanban` | `tasks/TasksKanban.tsx` | Tasks page |
| `Modal` | `components/ui/Modal.tsx` | All pages |
| `Toast` | `components/ui/Toast.tsx` | All pages |
| `Forms` (Button, Input, Select) | `components/ui/Forms.tsx` | All pages |
| `EmptyState` | `components/ui/EmptyState.tsx` | Multiple pages |
| `CustomFieldInput` | `components/ui/CustomFieldInput.tsx` | LeadFormModal, Settings |
| `Sidebar` | `components/shell/Sidebar.tsx` | App layout |
| `Topbar` | `components/shell/Topbar.tsx` | App layout |
| `PeriodSelector` | `components/dashboard/PeriodSelector.tsx` | Dashboard, Analytics |
| `PortalTaskApproveButton` | `components/portal/PortalTaskApproveButton.tsx` | Portal page |

---

## Lib / Util
| File | Description |
|---|---|
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client |
| `lib/supabase/admin.ts` | Service-role Supabase client |
| `lib/team.ts` | Team helpers |
| `lib/errors.ts` | friendlyError() |
| `lib/customFields.ts` | Custom field utilities |
| `src/types/supabase.ts` | DB types (stub — not generated) |

---

## Database Tables (18 total, all RLS enabled)
`activities`, `brainstorm_notes`, `companies`, `contacts`, `expenses`, `invoices`, `lead_stage_history`, `lead_tags`, `leads`, `notifications`, `pipeline_stages`, `projects`, `proposals`, `system_settings`, `tags`, `task_comments`, `tasks`, `users`

---

## NOT on the Feature Map (MISSING — audit findings)
- My Work / personal dashboard page
- Time logging UI
- Attachments
- Notification bell UI (table exists, no UI)
- Role-based access control (only `authenticated_all` policies)
- Workload / utilisation views
- Project templates
- Credentials vault
- Portal magic-link login
- ROI widget admin input
- Portal "Request Changes" button
- Weekly digest cron
- Retainer auto-invoicing cron
- `/api/debug-env` route (referenced in middleware public allowlist but doesn't exist — harmless)
