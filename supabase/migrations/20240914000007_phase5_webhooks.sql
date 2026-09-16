-- ============================================================
-- Phase 5: Webhooks & Ingestion Engine
-- Extends leads table for website ingestion and scoring
-- ============================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget_tier TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS timeline TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_page TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS submission_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS raw_payload JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ttclid TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_ip TEXT;

-- Add index on lead_score for sorting
CREATE INDEX IF NOT EXISTS leads_score_idx ON leads (lead_score DESC);
