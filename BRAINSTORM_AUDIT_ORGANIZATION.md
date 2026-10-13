# Organization and integration audit

Actual Playwright browser and isolated Supabase run 334c4d19 on http://127.0.0.1:3002.

- PASS: Blank creation plus creator/editor/time
- PASS: Debounced title/content search and empty state
- PASS: Title and created-date sorting
- PASS: Pins move immediately to top after save
- PASS: Archive hides immediately and statuses filter
- PASS: Tags create assign filter and remove
- PASS: Three templates create expected editable headings and blocks
- PASS: Client lead project chips navigate real targets
- PASS: Duplicate preserves tags status links private visibility with independent id
- PASS: Checklist converts to existing task with assignee date source link
- PASS: Selected partial text converts precisely to task
- PASS: Team unassigned task allowed and private restriction enforced
- PASS: Duplicate images own objects survive source privacy and deletion
- PASS: Pagination bounds and next previous

Evidence: tests/brainstorming/audit-organization.mjs and test-results/audit-organization*.png/json.
