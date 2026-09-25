-- Schema that was previously applied only by one-off Node scripts
-- (run_finance_migration.js, run_sales_migration.js, run_notifications_migration.js,
-- db_patch_tasks.js, db_patch_portal.js). Captured here so a fresh database can be
-- rebuilt from supabase/migrations alone. Idempotent.

-- ─── invoices: line items, tax, discount, retainers ──────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS retainer_month DATE,
  ADD COLUMN IF NOT EXISTS is_retainer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS partial_paid NUMERIC DEFAULT 0;

-- ─── proposals: line items, validity, acceptance ─────────────
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS valid_until DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- ─── expenses ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  category TEXT NOT NULL DEFAULT 'tools',
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  vendor TEXT,
  payment_method TEXT DEFAULT 'bkash',
  receipt_url TEXT,
  notes TEXT,
  is_billable BOOLEAN DEFAULT false,
  is_billed BOOLEAN DEFAULT false
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "authenticated_all" ON expenses FOR ALL USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── leads: next action; activities: type ────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS next_action_type TEXT,
  ADD COLUMN IF NOT EXISTS next_action_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_action_notes TEXT;

ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'note';

-- ─── notifications ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "authenticated_all" ON notifications FOR ALL USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── tasks: internal PM fields ───────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT 'feature';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS dri_name VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS loom_url TEXT;

-- ─── task_comments ───────────────────────────────────────────
-- The original script never enabled RLS on this table.
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  author_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_blocker BOOLEAN DEFAULT FALSE,
  is_decision BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "authenticated_all" ON task_comments FOR ALL USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── projects: client-facing ROI figures ─────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_ad_spend NUMERIC DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS leads_generated INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS est_roi_value NUMERIC DEFAULT 0;
