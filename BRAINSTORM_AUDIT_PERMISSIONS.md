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
- PASS: Browser: mention deep link opens discussion and addressed comment
- PASS: Browser: two-minute inactivity pauses first writer and second writer can resume
- PASS: Browser: private note hidden from other admin, outsider and signed-out login boundary

Screenshot: `test-results/audit3-discussion.png`.

- PASS: Browser mention deep link opens discussion and addressed comment; resolve/reopen awaited through confirmed UI state. Screenshot reviewed: `test-results/audit3-discussion-reopened.png`.
