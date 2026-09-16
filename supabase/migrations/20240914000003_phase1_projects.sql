-- Service line discriminator, add to leads and new projects table
CREATE TYPE service_line_type AS ENUM ('tech_solutions', 'web_development', 'marketing');

ALTER TABLE leads ADD COLUMN service_line service_line_type;
ALTER TABLE leads ADD COLUMN utm_source TEXT;
ALTER TABLE leads ADD COLUMN utm_medium TEXT;
ALTER TABLE leads ADD COLUMN utm_campaign TEXT;
ALTER TABLE leads ADD COLUMN utm_term TEXT;
ALTER TABLE leads ADD COLUMN utm_content TEXT;
ALTER TABLE leads ADD COLUMN gclid TEXT;
ALTER TABLE leads ADD COLUMN fbclid TEXT;
ALTER TABLE leads ADD COLUMN fbp TEXT;
ALTER TABLE leads ADD COLUMN fbc TEXT;
ALTER TABLE leads ADD COLUMN click_id TEXT;

-- Projects: the missing delivery layer
CREATE TYPE project_status_type AS ENUM ('planning', 'blocked', 'active', 'review', 'completed', 'retained');

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    service_line service_line_type,
    status project_status_type NOT NULL DEFAULT 'planning',
    budget NUMERIC(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'BDT',
    start_date DATE,
    target_date DATE,
    repository_url TEXT,
    staging_url TEXT,
    production_url TEXT
);

ALTER TABLE tasks ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN is_client_visible BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN requires_client_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN is_out_of_scope BOOLEAN DEFAULT FALSE;

-- RLS policies for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON projects FOR ALL USING (auth.uid() IS NOT NULL);
