-- Add new columns to leads for Google-Sheet style view
ALTER TABLE leads ADD COLUMN IF NOT EXISTS niche text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS demo_status text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS running_meta_ads boolean DEFAULT false;

-- Create brainstorm_notes table
CREATE TABLE IF NOT EXISTS brainstorm_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  status text check (status in ('idea','in_progress','done','archived')) default 'idea',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for brainstorm_notes
ALTER TABLE brainstorm_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON brainstorm_notes FOR ALL USING (auth.uid() is not null);

-- Auto-update updated_at on brainstorm_notes
CREATE TRIGGER brainstorm_notes_updated_at
  BEFORE UPDATE ON brainstorm_notes
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
