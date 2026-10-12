# Settings: Gap Analysis and Implementation Plan

Date: 2026-09-26

## 1. What Settings has today

Four horizontal tabs in `src/app/(app)/settings/page.tsx`.

| Tab | What works | What is missing or broken |
|---|---|---|
| Pipeline Stages | Add, delete, Won/Lost checkboxes | No rename. Reorder handle is decorative. A stage can be both Won and Lost. Deleting a stage orphans its leads (they vanish from the board). Errors are ignored silently |
| Services | Add, delete | No rename, no reorder, duplicates allowed, errors ignored |
| Custom Fields | Add, delete; types Text and Link | No rename, no reorder, no required flag, no Number/Date/Dropdown/Checkbox/Long text. Delete ignores errors |
| Team Members | Adds a row to a list | **Does not create a login.** Role list is missing "Sales". Remove leaves the person able to log in. No role edit, no password reset |

## 2. What a proper CRM Settings area has that this one does not

Found by reading the code that consumes settings, and every value that is hardcoded in pages:

| Gap | Where it is hardcoded or missing today |
|---|---|
| Company profile (name, email, phone, address, tax ID) | Print invoice hardcodes "Momentum Labz / Dhaka, Bangladesh / hello@momentumlabz.com" |
| Real team accounts, role editing, password reset, removal that revokes access | Settings > Team; Topbar hardcodes "Fatin Jarif / Owner" for everyone |
| My account (own name, change password) | Nowhere |
| Lead sources | Hardcoded `<option>`s in the lead form plus a DB CHECK constraint |
| Lost reasons (and the Lost Reason prompt) | Nowhere. Moving a lead to Lost is currently impossible (the prompt is never shown) |
| Tags management | Tags can be used on leads but cannot be created, renamed or deleted anywhere |
| Region to currency defaults | Stored in `system_settings.currency_mapping` but never read |
| FX rates | Hardcoded `{USD:120, AUD:80, EUR:130}` in the Leads Kanban |
| Invoice numbering and defaults (prefix, tax, payment terms, method, footer) | Hardcoded `ML-` prefix, tax 0, method bKash, no due date default |

## 3. Design

- **Layout:** Settings gets a grouped left menu (the standard CRM pattern), with the section content on the right. On phones the menu becomes a horizontal scroll row. The open section is kept in the URL (`/settings?tab=team`), so refresh and links work.
  - Workspace: Company profile, Team, My account
  - Sales: Pipeline, Lead sources, Services, Custom fields, Tags
  - Finance: Currency & FX, Invoicing
- **Look:** design system only. Cards with 1px `neutral-100` border and `radius-lg`, no resting shadow. `micro` uppercase labels. Lucide icons at 1.75 stroke. Toasts bottom-right with a 3px colour bar (spec 8.13). Empty states per spec 8.14. `tabular-nums` on numbers.
- **Behaviour on every screen:** loading skeleton, empty state, success toast on save, error toast on failure with the real message, buttons disabled while saving, confirm dialogs for destructive actions.
- **No new npm dependencies.** Drag-to-reorder uses native drag plus Up/Down buttons (keyboard and touch friendly).

## 4. Data changes (one numbered migration)

`supabase/migrations/20260926000001_settings_hub.sql`, all idempotent:

- `system_settings` new columns: `company_profile`, `lead_sources`, `lost_reasons`, `fx_rates`, `fx_rates_updated_at`, `invoice_settings`. Defaults equal today's hardcoded values, so nothing changes until you edit them.
- Drop the `leads.source` CHECK constraint so sources can be customised. Existing source ids are kept as defaults (including `inbound_form`, which the website intake uses).
- Trigger: renaming a stage renames it on every lead (leads store the stage name).
- Functions: `reorder_pipeline_stages`, `delete_pipeline_stage` (moves that stage's leads to another stage first), `rename_service` (updates settings, leads and proposals together).

## 5. Implementation order (each step is built, then verified before the next)

| # | Step | Also wires into |
|---|---|---|
| 0 | Restore buildable types stub (QA-001), migration above | |
| 1 | Settings shell: grouped menu, URL tab, toast, shared section UI | |
| 2 | Pipeline: rename, reorder, Won/Lost exclusive, safe delete with move-to, lost reasons | Leads page: Lost Reason prompt (fixes QA-009) |
| 3 | Lead sources | Lead form, lead drawer |
| 4 | Services: rename (cascades), reorder, duplicate guard | |
| 5 | Custom fields: 7 types, dropdown options, required, rename, reorder | Lead form (renders and validates by type), lead drawer (displays by type) |
| 6 | Tags: add, rename, delete, usage counts | |
| 7 | Currency & FX: region defaults, rates with last-updated | Lead form currency default; Leads Kanban totals and "rates updated" note |
| 8 | Invoicing: prefix, default tax, payment terms, default method, footer | Invoices form defaults and numbering; print view |
| 9 | Company profile | Print invoice header |
| 10 | Team: real logins (temporary password shown once), edit role, reset password, remove revokes login, cannot remove yourself or the last owner | Server route using the service-role key |
| 11 | My account: name, change password | Topbar shows the real signed-in name and role |
| 12 | Final regression over every section | |

## 6. Known limits (stated honestly)

- **Roles are labels plus team-management rights only.** Owner/Admin can manage the team. Role-based data restrictions (e.g. hiding finance from Viewers) are Phase 1 RLS work and are not part of this plan. The Team screen says so.
- **Invites use a temporary password, not an email.** Supabase's built-in email sender only delivers to members of your Supabase organisation and is limited to a few emails per hour, so emailed invites would silently not arrive for most people. You share the temporary password yourself (e.g. WhatsApp). Email invites can be added once custom SMTP is configured.
- **Live testing needs `DATABASE_URL`** in `.env.local`, so the migrations can be applied. Until then, steps are verified with an in-memory Postgres, the type checker and lint.
