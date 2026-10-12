# Independent audit 5: design, usability and CRM regression

Status: in progress. Initial browser checks ran against localhost:3002 development server. Final regression is pending the stable built preview.

## Reference
Read the full `momentumlabzz_CRM_Design_System_v1.0` approved in place of missing design.md. Brainstorming uses the existing neutral palette, ink RGB(28,28,28), Inter font, restrained accent, borders, shared form/button components and scoped editor styles. Desktop screenshot inspected visually.

## Verified in initial browser pass
- New Note opened editor and saved actual note title.
- Desktop title uses ink RGB(28,28,28) and Inter with Bengali fallback.
- Keyboard Tab from title reaches labeled status control with visible focus outline.
- At 375px the document and body widths are 375px, with no horizontal overflow.
- Discussion opens its own panel; close returns to editor; Notes returns to list.
- Dashboard, Leads, Proposals, Contacts & Companies, Projects, Finance Overview rendered without page errors.

## Bugs reported to root
- Topbar notification bell lacked accessible name/tooltip. Root added these; final browser recheck pending.
- New module dialogs inherited shared Modal without focus placement/trap or dialog semantics. Root added opt-in focus management to Brainstorming dialogs; final browser recheck pending.

## Initial run limitations
Development route cold compilations repeatedly stalled for 60–90s. Tasks emitted `Invalid or unexpected token`; Clients navigation timed out. Server was stopped for stable build before remaining modules. These are not counted as confirmed application defects until rerun. Mobile screenshot taken immediately after desktop resize caught the sidebar mid-transition; fresh mobile rerun is required.

Automated checks: `tests/brainstorming/audit-design.mjs`, `audit-design-mobile.mjs`, `audit-design-followup.mjs`. Initial artifacts under `test-results/audit-design/`.
