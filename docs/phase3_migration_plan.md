# Phase 3: Profitability & Utilisation Migration Plan

## 1. Time Logging, One Tap
**Schema Updates:**
- Create `time_entries` table:
  - `id UUID PRIMARY KEY`
  - `user_id UUID REFERENCES users(id) ON DELETE CASCADE`
  - `task_id UUID REFERENCES tasks(id) ON DELETE CASCADE`
  - `project_id UUID REFERENCES projects(id) ON DELETE CASCADE`
  - `minutes INT NOT NULL`
  - `logged_at TIMESTAMPTZ DEFAULT now()`
  - `is_billable BOOLEAN DEFAULT true`
  - `note TEXT`

**UI Implementation (Strictly No Friction):**
- **Task Card & Drawer**: Add a start/stop timer button. When stopped, it instantly saves the elapsed time to `time_entries` without prompting for a note.
- **Quick-log buttons**: Add buttons for +15m, +30m, +1h, +2h on the task detail view. One tap instantly saves the time.
- **My Work**: Add a section displaying "Today's Time". Allow inline editing of the `minutes` and `note` fields without navigating away.
- **Rules**: No timesheet grid, notes are strictly optional, and no approval workflow.

## 2. Cost Rates & Capacity
**Schema Constraints (CRITICAL):**
- In Supabase, Row Level Security (RLS) applies to the *entire row*, not individual columns. If we add `cost_rate` directly to the `users` table, any user who can view a team member (necessary for assigning tasks or `@` mentions) will also be able to see their cost rate.
- **Solution**: We will create a `user_costs` table (1:1 with `users`) that holds `cost_rate`, `currency`, and `weekly_capacity_hours`. This allows us to enforce strict Admin-only RLS on the financial data while keeping the `users` table accessible.

**Schema Updates:**
- Create `user_costs` table:
  - `user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`
  - `cost_rate NUMERIC(10, 2) DEFAULT 0`
  - `currency TEXT DEFAULT 'USD'`
  - `weekly_capacity_hours INT DEFAULT 40`

## 3. Project Profitability Card
**UI Implementation:**
- Add a new Card to the Project Detail view.
- Calculate metrics: 
  - `budget`, `invoiced`, `expenses` (assuming these fields exist or will be added to the `projects`/`invoices` tables; need to verify current schema for these inputs).
  - `labour cost` = sum of (`time_entries.minutes` / 60) * `user_costs.cost_rate`.
  - `margin` = (`invoiced` - `expenses` - `labour cost`).
- Group by currency. Never sum across different currencies.
- Render charts using **`recharts`** (approved).
- **Empty State**: If inputs (like cost rates or budget) are missing, display a clear "Not enough data" state instead of $0.

## 4. Utilisation
**UI Implementation:**
- On the Team page, add a Utilisation section (visible to Admin and Manager only).
- Calculate per person per month: `(sum of billable time_entries) / (user_costs.weekly_capacity_hours * 4.33 weeks)`.
- Use **`recharts`** to visualize the data over time.
- **Required Copy**: Add the exact inline note: *"Typical agency utilisation runs 50 to 70 percent overall. Sustained figures above 90 percent indicate overload."*

---

# Migration SQL Script

```sql
-- 1. TIME ENTRIES
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    minutes INT NOT NULL CHECK (minutes > 0),
    logged_at TIMESTAMPTZ DEFAULT now(),
    is_billable BOOLEAN DEFAULT true,
    note TEXT
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
-- Admins and managers see all time entries
CREATE POLICY "AdminManager_All_Time" ON time_entries FOR ALL USING (get_user_role() IN ('admin', 'manager'));
-- Members can manage their own time entries
CREATE POLICY "Member_Manage_Own_Time" ON time_entries FOR ALL USING (user_id = auth.uid());


-- 2. USER COSTS (Admin Only)
CREATE TABLE IF NOT EXISTS user_costs (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    cost_rate NUMERIC(10, 2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    weekly_capacity_hours INT DEFAULT 40
);

ALTER TABLE user_costs ENABLE ROW LEVEL SECURITY;
-- ONLY Admins can see or manage cost rates
CREATE POLICY "Admin_All_UserCosts" ON user_costs FOR ALL USING (get_user_role() = 'admin');
```
