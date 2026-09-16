# GLOBAL_RULES.md — Momentum Labz CRM (attach to every Antigravity session)

## VISUAL LAW
* `MomentumLabz_CRM_Design_System.md` is binding. Tokens only — zero hardcoded hex anywhere.
* Cards: 1px `neutral-100` border, `radius-lg`, NO shadow at rest. Buttons/inputs/badges/tooltips/tables: exact specs from Section 8. Motion ≤250ms, except first-load chart draw (400–600ms).
* `tabular-nums` on every figure. Table headers & eyebrows: micro, uppercase, `letter-spacing: 0.04em`.
* Icons: Lucide only, stroke 1.75. Focus ring: 3px `accent-500` at 20% opacity. Never gold text on white.

## STACK & DATA LAW
* Next.js 14 App Router, Tailwind, Supabase via `createBrowserClient`, Lucide. TypeScript strict.
* NO new npm dependencies unless a prompt explicitly permits one.
* Every new table: RLS enabled + same policy pattern as existing tables.
* All mutations: optimistic UI update, rollback + error toast (spec 8.13) on failure.
* Every list/page: skeleton loading state matching final layout, empty state per spec 8.14, error toast on failure.
* NEVER hardcode stage names. Won/Lost detection only via `pipeline_stages.is_won` / `is_lost`; ordering only via `sort_order`.
* NEVER blend currencies. BDT/USD/AUD always displayed separately; region→currency defaults from `system_settings`. Format numbers via `Intl.NumberFormat` (৳ for BDT, $ for USD/AUD).
* ADDITIVE ONLY: do not restyle, refactor, or restructure any existing page. New nav items only where a prompt specifies. New Settings features = new tabs consistent with the existing Settings Hub.
* All fetches: filter `deleted_at IS NULL` (after Step 2 ships soft delete).

## DEFINITION OF DONE
* Every acceptance criterion in the prompt verified in the running app AND in Supabase.
* If a criterion cannot be met, STOP and report — do not improvise a substitute behavior.
