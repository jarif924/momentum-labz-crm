# Security & Permissions Audit

## Auth & Middleware
- [PASS] NEXT_PUBLIC_BYPASS_AUTH is NOT set in any env file
- [PASS] Unauthenticated GET / redirects to /login (307 Redirect)
- [PASS] Unauthenticated GET /leads redirects to /login (307 Redirect)
- [PASS] Unauthenticated GET /portal/[id] is accessible (public route) (Returns 200 OK)
- [FAIL] Unauthenticated GET /proposal/[id] is accessible (public route) - **Returns 500 Internal Server Error** due to missing module `./vendor-chunks/@supabase.js`.
- [PASS] Service-role key NOT used in any 'use client' component
- [PASS] /api/debug-env does not exist (Redirects to /login)

## API Routes - Auth
- [PASS] /api/leads/ingest rejects request with no API key (401 or 403)
- [PASS] /api/leads/ingest rejects wrong API key
- [FAIL] /api/leads/ingest accepts correct API key - **Failed with 401 Unauthorized**. The provided curl command uses the `-H 'x-api-key: ...'` header, but the source code expects `-H 'x-crm-api-key: ...'`.
- [PASS] /api/cron/reminders rejects missing CRON_SECRET
- [PASS] /api/cron/reminders rejects wrong CRON_SECRET

## Input Validation
- [BLOCKED] /api/leads/ingest: malformed JSON rejected with clear error - **Blocked** because the request was rejected by Auth (401) before checking JSON parsing (due to wrong API key header).
- [BLOCKED] /api/proposal/[id]/accept: signature too short rejected - **Blocked** by 500 Internal Server Error (`Cannot find module './vendor-chunks/@supabase.js'`).
- [BLOCKED] /api/proposal/[id]/accept: accepting already-accepted proposal returns 409 - **Blocked** by 500 Internal Server Error.
- [PASS] No SQL string concatenation anywhere in API routes - Verified parameterization (e.g., `$1`, `$2`).

## Secrets in Code
- [PASS] No hardcoded Supabase URLs in src/ files
- [PASS] No hardcoded API keys or secrets in src/ files
- [FAIL] Root-level .js/.mjs scripts: check if they still contain secrets (the old DB connection strings) - **Failed**. `patch_route.js` and `patch_route2.js` contain hardcoded `kirekikhbr@@$$924`.
- [FAIL] Git history: check if secrets are in committed history - **Failed**. Git history contains commits with plaintext database URLs (`postgresql://postgres.mjvpdvopcxpthultrjpf:kirekikhbr...`).

## RLS Policy Audit
- [PASS] All 18 tables have RLS enabled (check policy list)
- [PASS] Policy type: Documented. All policies are set to `authenticated_all` (with role `{public}`) and qual `(auth.uid() IS NOT NULL)`, except `lead_stage_history` which has role `{authenticated}`. 
- [FAIL] Are there any SELECT policies that could leak data between users? - **Yes**. The `authenticated_all` policy applies to almost all tables, meaning any logged-in user can read (and write) ALL rows in ALL tables. There is no role-based filtering or multi-tenancy enforced at the database level.
- [PASS] task_comments: has RLS enabled (QA-005 was fixed — verify)

**CRITICAL FINDING:**
The RLS is set to `authenticated_all` across the board, meaning ANY logged-in user can read/write ANY row in the database. If different users or clients are expected to have restricted access to specific data, this is NOT acceptable for launch and will result in a data leak.
