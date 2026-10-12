# Brainstorming independent audit 3: collaboration and permissions

Local-only Supabase 55321 and localhost 3002. Direct API checks and independent Playwright browser contexts.

- PASS: One writer, even a second session of same user, and stale save rejection
- PASS: Expired writer lock allows another writer, old token cannot save
- PASS: Private creator only: owners admins sales viewer outsider and anon cannot read or mutate
- PASS: Viewer reads and comments, cannot create/edit/lock/trash; outsider and anonymous blocked
- PASS: Comments replies edit ownership admin moderation and resolve/reopen
- PASS: Mention recipient notification deep link and no leakage; private mentions skip unauthorized recipients
- PASS: No self role elevation or unauthorized direct note/lock/history mutation
- PASS: Private image protected through download/public URL/signed URL; only locked editor uploads
- PASS: Private task creator only, including other admins and after note permanent deletion
- PASS: Browser: two writers lock, viewer read-only and comment UI, replies resolution and mention UI
- PASS: Browser: two-minute inactivity pauses first writer and second writer can resume
- PASS: Browser: private note hidden from other admin, outsider and signed-out login boundary

Screenshot: `test-results/audit3-discussion.png`.

- PASS: Browser mention deep link opens discussion and addressed comment; resolve/reopen awaited through confirmed UI state. Screenshot reviewed: `test-results/audit3-discussion-reopened.png`.

## Result

**PASS: 13 independent checks (9 direct API groups, 4 browser groups).** No application defects remained in this audit. No application source files were edited by this auditor.

The browser used separate authenticated editor, teammate, viewer, admin and outsider contexts plus a signed-out page. Two-minute inactivity was advanced with Playwright's browser clock; server lock-expiration rejection was independently exercised by expiring only this audit's lock row through the isolated local service client. Private-task access after note deletion was tested with service-role deletion of the isolated fixture, because another admin correctly cannot access a teammate's private note.

Early attempts were interrupted by local runtime restart/cold compilation and a login hydration race in the test fixture. The final test fixture waits for React event handlers before filling credentials and verifies `readOnly` correctly. The complete final run exited 0. The supplementary browser run also exited 0, confirmed deep-link discussion opening and resolved/reopened UI state, and its screenshot was visually reviewed.

Reproduce:

```sh
node tests/brainstorming/audit-permissions.mjs
node tests/brainstorming/audit-permissions-deeplink.mjs
```

All data and files were created against local Supabase `127.0.0.1:55321` and local CRM `127.0.0.1:3002`. No production database, GitHub, or deployment changes were performed.
