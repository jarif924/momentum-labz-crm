# Phase 1: Team App Migration Plan

## 1. Real Accounts & Orphan Rows Migration Strategy

**The Problem:**
Currently, `users.id` contains random UUIDs (via `gen_random_uuid()`) that do not exist in `auth.users`. To enforce `ALTER TABLE users ADD CONSTRAINT fk_auth FOREIGN KEY (id) REFERENCES auth.users(id)`, every existing ID in `users` must be present in `auth.users`. 

**The Strategy:**
Instead of deleting existing rows (which would cascade and delete associated tasks/leads), we will use a **Node.js script with the Supabase Admin API** to backfill the Auth accounts.
1. Fetch all rows from the `users` table.
2. For each user, call `supabase.auth.admin.createUser()` explicitly passing the *existing* `users.id` as the `id` parameter (the Admin API allows setting the UUID).
3. Assign a secure temporary password and set `email_confirm: true`.
4. Once all auth accounts are created, we can safely apply the foreign key constraint via SQL.

We will also add an `is_active` boolean toggle to support soft deletes.

## 2. Roles (Exactly Three)
We will drop the existing `role` constraint, map the legacy roles, and enforce the new constraint.

*Mapping:*
- `owner` → `admin`
- `sales` → `manager`
- `viewer` → `member`

## 3. Assignee Foreign Key & DRI Backfill
We will add `assignee_id UUID REFERENCES users(id)` to the `tasks` table. 
For the backfill, we will run a query that matches `tasks.dri_name` to `users.full_name` (case-insensitive) where an exact match exists. 
We'll execute this as a DO block that raises a notice with the exact count of matched vs unmatched records.
Afterward, we will update the `TaskModal` UI to use a native dropdown mapping to `assignee_id` while preserving `dri_name` visually if `assignee_id` is null.

## 4. RLS Per Role

**Note on `users.cost_rate`:**
The prompt specifies restricting `users.cost_rate` to admins without using per-field permissions. Because PostgreSQL RLS operates at the *row* level, not the *column* level, any policy that allows a user to read a row in `users` will expose all columns in that row. 
*Recommendation:* To respect the "no per-field permissions" constraint while securing the data, we will create a lightweight `user_costs` table (with a 1:1 FK to `users`). Admins will have full RLS access to this table, while others will have none.

**Policies Overview:**
- **Admins:** Full CRUD on everything.
- **Managers:** Full CRUD on everything *except* `invoices`, `expenses`, `proposals`, and `user_costs`.
- **Members:** 
  - `leads`: NO access.
  - `tasks`: Can read/update where `assignee_id = auth.uid()` or where they are a member of the parent project.
  - `projects`: Can read where they are linked via a new `project_members` mapping table.

## 5. "My Work" Page & UI Updates
- Create `/src/app/(app)/my-work/page.tsx` as a tailored dashboard.
- Update `/src/app/(app)/page.tsx` (Dashboard) logic: if user is not `admin`, redirect to `/my-work`.
- Update the sidebar navigation to include "My Work" and "Dashboard" routes based on role.
- Update `Settings > Team Members` to invoke an API route that calls `supabase.auth.admin.inviteUserByEmail()`.

---

# Migration SQL Script

```sql
-- ============================================================
-- Phase 1 Migration: Team Accounts, Roles, and RLS
-- ============================================================

-- 1. USER ACCOUNTS & ORPHAN ROWS
-- Note: Run the Node.js Admin API script to backfill auth.users FIRST before running this block.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
-- (Uncomment after backfill) ALTER TABLE users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. ROLES (EXACTLY THREE)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE users SET role = 'admin' WHERE role = 'owner';
UPDATE users SET role = 'manager' WHERE role = 'sales';
UPDATE users SET role = 'member' WHERE role = 'viewer';

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'member'));
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'member';


-- 3. ASSIGNEE FOREIGN KEY & DRI BACKFILL
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES users(id) ON DELETE SET NULL;

DO $$
DECLARE
    matched_count INT;
    unmatched_count INT;
BEGIN
    -- Perform the backfill
    UPDATE tasks t
    SET assignee_id = u.id
    FROM users u
    WHERE lower(trim(t.dri_name)) = lower(trim(u.full_name));

    -- Calculate counts
    SELECT count(*) INTO matched_count FROM tasks WHERE assignee_id IS NOT NULL;
    SELECT count(*) INTO unmatched_count FROM tasks WHERE assignee_id IS NULL AND dri_name IS NOT NULL AND dri_name != '';

    RAISE NOTICE 'Backfill complete. Matched % tasks. Unmatched % tasks.', matched_count, unmatched_count;
END $$;


-- 4. RLS POLICIES

-- Helper Function: Get User Role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Projects Membership Table (Needed for "on the project" logic)
CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AdminManager_All_ProjectMembers" ON project_members FOR ALL USING (get_user_role() IN ('admin', 'manager'));
CREATE POLICY "Member_Select_ProjectMembers" ON project_members FOR SELECT USING (user_id = auth.uid());

-- User Costs Table (1:1 with users)
CREATE TABLE IF NOT EXISTS user_costs (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cost_rate numeric NOT NULL DEFAULT 0
);
ALTER TABLE user_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin_All_Costs" ON user_costs FOR ALL USING (get_user_role() = 'admin');

-- Clear existing blanket policies
DROP POLICY IF EXISTS "authenticated_all" ON users;
DROP POLICY IF EXISTS "authenticated_all" ON companies;
DROP POLICY IF EXISTS "authenticated_all" ON contacts;
DROP POLICY IF EXISTS "authenticated_all" ON leads;
DROP POLICY IF EXISTS "authenticated_all" ON projects;
DROP POLICY IF EXISTS "authenticated_all" ON tasks;
DROP POLICY IF EXISTS "authenticated_all" ON invoices;
DROP POLICY IF EXISTS "authenticated_all" ON proposals;

-- USERS
CREATE POLICY "Users_Read_All" ON users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "AdminManager_Update_Users" ON users FOR UPDATE USING (get_user_role() IN ('admin', 'manager'));

-- LEADS
CREATE POLICY "AdminManager_All_Leads" ON leads FOR ALL USING (get_user_role() IN ('admin', 'manager'));
-- Members see none by default.

-- PROJECTS
CREATE POLICY "AdminManager_All_Projects" ON projects FOR ALL USING (get_user_role() IN ('admin', 'manager'));
CREATE POLICY "Member_Read_Projects" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
);

-- TASKS
CREATE POLICY "AdminManager_All_Tasks" ON tasks FOR ALL USING (get_user_role() IN ('admin', 'manager'));
CREATE POLICY "Member_Select_Tasks" ON tasks FOR SELECT USING (
  assignee_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())
);
CREATE POLICY "Member_Update_Tasks" ON tasks FOR UPDATE USING (
  assignee_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())
);

-- FINANCE (Invoices, Proposals, Expenses)
CREATE POLICY "Admin_All_Invoices" ON invoices FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Admin_All_Proposals" ON proposals FOR ALL USING (get_user_role() = 'admin');

```
