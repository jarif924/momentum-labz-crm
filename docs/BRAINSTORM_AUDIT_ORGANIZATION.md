# Organization and integration audit

Actual Playwright browser and isolated Supabase run 69ad9bf4 on http://127.0.0.1:3002.

- PASS: Blank creation plus creator/editor/time
- PASS: Debounced title/content search and empty state
- PASS: Title and created-date sorting
- FAIL: Pins move immediately to top after save — locator.click: Timeout 20000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: 'Pin', exact: true })[22m

- FAIL: Archive hides immediately and statuses filter — Expected values to be strictly equal:

1 !== 0

- FAIL: Tags create assign filter and remove — The expression evaluated to a falsy value:

  assert.ok((await get(a)).tags.includes(tag))

- PASS: Three templates create expected editable headings and blocks
- FAIL: Client lead project chips navigate real targets — Expected values to be strictly equal:

false !== true

- FAIL: Duplicate preserves tags status links private visibility with independent id — locator.click: Timeout 20000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: 'Duplicate', exact: true })[22m

- FAIL: Checklist converts to existing task with assignee date source link — locator.click: Timeout 20000ms exceeded.
Call log:
[2m  - waiting for locator('.bn-editor [contenteditable="true"]').first()[22m

- FAIL: Team unassigned task allowed and private restriction enforced — locator.click: Timeout 20000ms exceeded.
Call log:
[2m  - waiting for locator('.bn-editor [contenteditable="true"]').first()[22m

- FAIL: Pagination bounds and next previous — page.goto: Timeout 20000ms exceeded.
Call log:
[2m  - navigating to "http://127.0.0.1:3002/brainstorming", waiting until "load"[22m


Evidence: tests/brainstorming/audit-organization.mjs and test-results/audit-organization*.png/json.
