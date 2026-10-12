# Brainstorming audit 2: saving and data safety

Independent audit performed against localhost `http://127.0.0.1:3002` and isolated Supabase `http://127.0.0.1:55321`. No production database or GitHub writes were made by this auditor.

## Browser and database checks

- New note creation, server-confirmed save, 1.5-second autosave debounce, and Ctrl+S persist the exact title.
- Offline writes show **Save failed**, keep the per-user/per-note browser draft, and expose **Retry**. Successful retry removes that draft.
- Delaying `bn_save` by 2.5 seconds while switching notes saves the correct captured note ID; the second note stays untouched.
- Failed save blocks note switching. Refresh produces a leave warning and offers draft recovery. Restored title and status persist.
- Version history preview and restore work; the pre-restore current version remains in history.
- Three rapid writes produce one grouped history snapshot. Inserting 55 recent versions and one 31-day-old version then saving leaves exactly 50 recent snapshots.
- Browser Trash, restore, and admin permanent delete work. A regular sales member cannot permanently delete their own trashed note, but can restore it.
- Unsaved signout prompts for confirmation. Cancel keeps the session and draft; confirmed signout clears the draft and opens login.
- A separate disposable database round-trip preserves Bangla text, an internal blank line, and a trailing blank line as four paragraphs. Rollback restores exact original bytes. Reapplying the upgrade and repeating rollback work with preserved prior archive schemas.

## Findings fixed and rechecked

1. Upgrade reapplication failed because the retained private image bucket was inserted again. The root agent changed this to a safe upsert.
2. Rollback left `bn_notes_author`, causing reapplication to fail. The root agent added rollback index cleanup.
3. Repeated rollback collided with prior archive tables. The root agent now preserves prior archives under separate schema names.
4. Browser-draft recovery restored title and body only, losing unsaved metadata. The root agent added a metadata whitelist while retaining server identity, author, and version.
5. Unsaved signout previously cleared drafts without warning. The root agent added a confirmation before cleanup; Cancel and Confirm were browser-tested.

Test fixture issues were corrected: login waits for React hydration; run UUIDs prevent collisions with old audit notes; exact `Saved` matching avoids matching `Unsaved changes`; history API fixtures use a separate note; Trash actions wait for the preceding server operation before changing filters.

## Reproduce

```sh
node tests/brainstorming/audit-saving.mjs
node tests/brainstorming/audit-saving-tail.mjs
python3 tests/brainstorming/audit-migration.py
```

The Python test creates a uniquely named disposable database inside the local CRM database container. It does not reset the active database. Results and browser screenshots are written under `test-results/`.

## Scope

These tests cover saving/data safety. Editor formatting, image permissions, concurrent-user locks, organization/task integration, and the broad responsive regression checks belong to the other independent audits.
