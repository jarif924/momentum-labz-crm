# Brainstorming independent editor audit

Auditor 1. Actual headless Chromium browser against isolated localhost:3002 and local Supabase:55321. No live database writes.

## Initial browser run

17 checks passed: English and Bengali text with line breaks; visible Add creates H1, H2, H3, bullet, numbered, checklist, quote, callout, collapsible section, divider and table blocks; undo/redo; duplicate/delete current block; keyboard bold/italic/underline; rich HTML paste retains headings, bullets and links; pasted link has target=_blank; invalid non-image upload displays a clear error.

The first slash-menu locator accidentally targeted the hidden native Add option. That result is a test error and needs retesting against the visible BlockNote menu.

Reload after uploading an image showed an image element before it finished decoding. Retest must wait for naturalWidth>0 using a browser-generated valid PNG. After reload, editable block controls were missing while an earlier same-user lock remained. Root reports a fix to persist lock token in tab sessionStorage, which needs independent rerun.

Desktop screenshot inspected: editor uses the existing CRM shell, typography, sidebar, light backgrounds and compact controls. Bengali text renders legibly. Evidence: tests/brainstorming/evidence/editor-desktop.png and editor-results.json.

## Remaining checks

Deep browser tests prepared for actual slash menu; selection strike/highlight/clear; nested list/checklist interaction; collapsible children; table cell editing and row/column controls; move up/down; durable PNG rendering after reload; mobile375px controls/overflow. Link add/edit/remove, desktop drag, real clipboard image paste, oversized validation and Bengali composition events still require coverage.

A second browser pass was blocked by localhost /login failing to respond, confirmed independently by curl10sec with zero response bytes. Root is restarting the local dev server; this is not a production test result.

## Follow-up browser evidence

After fixing test hydration waits, slash menu is confirmed working using real key events (paste-style insertText does not trigger the slash menu). Selection toolbar strike, highlight and clear formatting passed; nested lists/checklist completion passed. A valid browser-generated PNG uploads privately, resolves to a rendered image after reload, and the refreshed tab retains writer controls after the session-token fix. Mobile375px editor and controls have no page overflow.

Repeated Move up/down now keeps the moved block selected and passes after root fixed cursor restoration. Real desktop mouse dragging moved Drag_A below Drag_C and persisted order Drag_B, Drag_C, Drag_A. See editor-drag.png.

Bengali composition events and subsequent Bengali line breaks persist after waiting for actual Saved state. Oversized image rejects with5MB error. Actual clipboard File paste uploads and renders, persists the durable brainstorm-image URL (including nested image blocks).

Nested collapsible children persist; visible collapse/reopen rerun is still finishing. Link creation and editing work and target=_blank is present. Link removal passed once but is intermittent in follow-up hover tests, so it is not currently certified reliable.

Confirmed application bug: after Add row below, the floating selection formatting toolbar overlaps the Delete row menu and intercepts clicks. Root is fixing stacking/hiding and the dedicated editor-table.mjs test will recheck all4 row/column add/delete actions. Default table handles initially lacked names; root added explicit Table row actions/Table column actions labels, now located by role in browser.

Tests deliberately use no force clicks. Fixed-delay database assertions were replaced by debounce delay plus confirmed Saved state. Initial stale-document failures were test timing errors.
