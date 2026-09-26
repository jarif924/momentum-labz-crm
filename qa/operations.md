# Operations & Tasks Audit Report

**Auditor:** INTERNAL OPERATIONS (Auditor 4)
**Date:** 2026-09-26

## 1. Tasks - All 3 Views
- [x] **PASS:** List view: shows all tasks, correct columns (St, Type, Task ID / Title, Project, DRI)
- [x] **PASS:** Kanban view: columns are task statuses, tasks appear in correct column
- [x] **PASS:** Founder view: exists and shows rollup of all tasks (shows active blockers and recent key decisions based on task_comments)
- [x] **PASS:** View switcher (list/board/founder) works

## 2. Tasks - CRUD
- [x] **PASS:** Create a task with: title, description, project link, lead link, due date, priority, assigned to (dri_name)
- [x] **PASS:** Task type dropdown works (Feature, Bug, Content)
- [x] **PASS:** Needs approval flag works
- [x] **PASS:** Client visible flag works
- [x] **PASS:** Out of scope flag works
- [x] **PASS:** Edit task — all fields update
- [x] **PASS:** Delete task
- [x] **PASS:** Drag between Kanban columns — status updates

## 3. Tasks - Task Modal
- [x] **PASS:** Modal opens when clicking a task
- [x] **PASS:** Assignee field: shows who is assigned
- [x] **PASS:** Project dropdown loads projects
- [x] **PASS:** Lead dropdown loads leads
- [x] **PASS:** Loom URL field
- [ ] **FAIL:** Task comments section: can add a comment
  - *Severity:* P1
  - *File:* `src/app/(app)/tasks/TaskModal.tsx`
  - *Expected:* A UI section to view and add comments to a task.
  - *Actual:* The entire comments section is missing from the modal UI, even though the database schema `task_comments` exists.
- [ ] **BLOCKED:** Add a comment with 'QA-OPS-' prefix text (Blocked by missing comment UI)
- [ ] **BLOCKED:** Blocker flag on comment (Blocked by missing comment UI)
- [ ] **BLOCKED:** Comment appears in list after saving (Blocked by missing comment UI)

## 4. Tasks - Follow-ups
- [ ] **FAIL:** Tasks with due dates today show in correct status
  - *Severity:* P3
  - *File:* `src/app/(app)/tasks/TasksKanban.tsx`, Line 95
  - *Expected:* Tasks due today should be highlighted or have a specific indicator.
  - *Actual:* The UI only highlights overdue tasks (`task.due_at < new Date().setHours(0,0,0,0)`). There is no special styling or status specifically for tasks due today.
- [x] **PASS:** Overdue tasks visible (highlighted in red)

## 5. Projects
- [x] **PASS:** Projects list shows all projects
- [ ] **FAIL:** Create a project manually
  - *Severity:* P2
  - *File:* `src/app/(app)/projects/page.tsx`
  - *Expected:* A button or form to manually create a project.
  - *Actual:* No UI exists for manual project creation. The empty state says they are automatically created when a lead is marked as "Won", meaning manual creation is impossible via this page.
- [x] **PASS:** Project detail page loads
- [x] **PASS:** Client-visible toggle works
- [x] **PASS:** Portal link works (opens /portal/[id])
- [ ] **FAIL:** Project status: planning, in_progress, completed, on_hold
  - *Severity:* P2
  - *File:* `src/app/(app)/projects/[id]/page.tsx`, Line 80
  - *Expected:* Ability to view and change project status to predefined states.
  - *Actual:* The status is rendered as static text in a span. There is no dropdown or action to change it.
- [ ] **BLOCKED:** Status change saves (Blocked by missing status dropdown UI)

## 6. Notifications
- [ ] **FAIL:** Topbar bell shows notification count
  - *Severity:* P3
  - *File:* `src/components/shell/Topbar.tsx`, Line 112
  - *Expected:* Bell icon should display the numeric count of unread notifications.
  - *Actual:* The UI only displays a red dot indicator (a small circle), not the actual count of unread items.
- [x] **PASS:** Clicking bell opens notification list
- [x] **PASS:** Mark all read

## 7. Missing Features
- **BLOCKED:** Time logging — No time-logging UI exists in TaskModal or anywhere else.
- **BLOCKED:** My Work page — The `/my-work` route does not exist.
- **BLOCKED:** Workload view — Does not exist.
- **BLOCKED:** Attachments — No file upload or attachment UI exists in the TaskModal.

## 8. EDGE CASES
- [x] **PASS:** Task with no due date — no crash (`task.due_at` is checked safely).
- [x] **PASS:** Task assigned to a non-existent user — no crash (`task.users?.full_name` optional chaining protects it).
- [ ] **FAIL:** Very long task title (500 chars) — UI doesn't break
  - *Severity:* P3
  - *File:* `src/app/(app)/tasks/TasksKanban.tsx`, Line 84
  - *Expected:* Very long titles should be truncated with ellipses or forcefully wrapped without breaking layout.
  - *Actual:* The UI lacks `truncate`, `line-clamp`, or `break-words` utilities, meaning a very long unspaced string could overflow the card horizontally and break the Kanban board layout.
- [x] **PASS:** Empty task list — empty state shown
- [x] **PASS:** Empty projects list — empty state shown (explains auto-creation from leads).
