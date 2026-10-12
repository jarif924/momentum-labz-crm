# Phase 2: Collaboration & Automation Migration Plan

## 1. Task Comments with Mentions
**Schema Updates:**
- `task_comments` exists, but we need to update it to use real accounts.
- Drop `author_name` and add `author_id UUID REFERENCES users(id) ON DELETE CASCADE`.
- Add `mentioned_user_ids UUID[]` to track who was mentioned.

**UI Implementation:**
- Add a comment thread section to the `TaskModal` and Task Drawer.
- Implement `@mention` autocomplete by fetching the `users` list and filtering on `@[text]`.
- Add the "This is a blocker" and "This is a decision" checkboxes mapped to `is_blocker` and `is_decision`.
- Verify the Founder view correctly rolls up these new comments.

## 2. Notifications
**Schema Updates:**
- The `notifications` table exists. We'll add a trigger or use application-level logic to insert notifications. Application-level (Next.js) is preferred here for simplicity.

**UI Implementation:**
- Build a Header Bell component with an unread count badge.
- Build a dropdown displaying the `notifications` with `type` icons.
- Add "Mark as Read" (per item) and "Mark All as Read" actions.

**Event Triggers (Application Logic):**
1. **Assigned a task**: Triggered when `tasks.assignee_id` is updated.
2. **Mentioned in a comment**: Triggered when parsing `mentioned_user_ids` on comment insert.
3. **Comment on your task**: Triggered on comment insert where `tasks.assignee_id` matches the user (and they aren't the comment author).
4. **Task moved to Review**: Triggered when `tasks.status` changes to 'Review'.
5. **Client approval needed**: Triggered when `tasks.requires_client_approval` is set to true on a task belonging to your project.

## 3. File Attachments
**Supabase Storage:**
- Create a new public (or authenticated) Storage bucket named `attachments`.
- Set a sane file size limit of **10MB** to prevent abuse while allowing most documents/images.

**Schema Updates:**
- Create an `attachments` table:
  - `id UUID PRIMARY KEY`
  - `file_url TEXT`
  - `file_name TEXT`
  - `file_type TEXT`
  - `size_bytes INT`
  - `task_id UUID REFERENCES tasks(id) ON DELETE CASCADE`
  - `project_id UUID REFERENCES projects(id) ON DELETE CASCADE`
  - `uploaded_by UUID REFERENCES users(id)`

**UI Implementation:**
- Add an upload dropzone in `TaskModal` and Project views.
- Inline `<img>` previews for `image/*` MIME types.
- Download chip (using Lucide icons) for all other types.

## 4. Project Templates
**Schema Updates:**
- Create `project_templates` table (`id`, `name`, `service_line`).
- Create `project_template_tasks` table (`id`, `template_id`, `title`, `description`, `default_status`, `sort_order`, `default_role`).

**UI Implementation:**
- Add a "Templates" tab in the Settings Hub.
- Use **`@dnd-kit`** (as approved) to allow drag-and-drop reordering of tasks within a template.
- Intercept the Lead -> "Won" status change to fetch the template matching the lead's `service_line`, dynamically generating the tasks.

*(Note: You selected to provide the task lists for the Website, Digital Product, and Marketing Retainer templates, but the text box was submitted empty. Please reply with the task lists when you're ready!)*

## 5. Workload View
**UI Implementation:**
- Create a new `/workload` route accessible only to `admin` and `manager` roles.
- Layout: Left column for `users.full_name`, right column with a stacked horizontal bar chart (`<div>` flex row) showing open tasks split by status (e.g., green for To Do, yellow for Review).
- Add a Project filter dropdown at the top to narrow down the task count.

---

# Migration SQL Script

```sql
-- 1. TASK COMMENTS
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS mentioned_user_ids uuid[] DEFAULT '{}';
-- (Optional: Backfill author_id from author_name if needed, then drop author_name)

-- 2. NOTIFICATIONS (Schema already exists, verifying structure)
-- Ensure type exists and user_id is linked to users.

-- 3. ATTACHMENTS
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    size_bytes INT NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CHECK (task_id IS NOT NULL OR project_id IS NOT NULL)
);
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AdminManager_All_Attachments" ON attachments FOR ALL USING (get_user_role() IN ('admin', 'manager'));
CREATE POLICY "Member_Read_Attachments" ON attachments FOR SELECT USING (
    (task_id IS NOT NULL AND EXISTS (SELECT 1 FROM tasks WHERE tasks.id = attachments.task_id AND (tasks.assignee_id = auth.uid() OR EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid()))))
    OR 
    (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM project_members WHERE project_id = attachments.project_id AND user_id = auth.uid()))
);
-- Need corresponding policies for INSERT/UPDATE/DELETE.

-- 4. PROJECT TEMPLATES
CREATE TABLE IF NOT EXISTS project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    service_line service_line_type NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS project_template_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    default_status TEXT DEFAULT 'To Do',
    sort_order INT NOT NULL DEFAULT 0,
    default_role TEXT -- e.g., 'designer', 'developer' to assign dynamically later
);
```
