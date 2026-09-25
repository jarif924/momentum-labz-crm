-- Settings Hub: configurable company profile, lead sources, lost reasons,
-- FX rates and invoice defaults, plus safe stage/service maintenance.
-- Defaults reproduce the values that were previously hardcoded in pages.

-- ─── system_settings: new configurable values ────────────────
ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS company_profile JSONB DEFAULT '{
    "name": "Momentum Labz",
    "email": "hello@momentumlabz.com",
    "phone": "",
    "address": "Dhaka, Bangladesh",
    "website": "",
    "tax_id": ""
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS lead_sources JSONB DEFAULT '[
    {"id": "meta_ad_library_scan", "label": "Meta Ad Library"},
    {"id": "instagram_dm", "label": "Instagram DM"},
    {"id": "referral", "label": "Referral"},
    {"id": "inbound_form", "label": "Inbound Form"},
    {"id": "cold_outreach", "label": "Cold Outreach"},
    {"id": "other", "label": "Other"}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS lost_reasons JSONB DEFAULT '["Price too high", "Bad timing", "Went with a competitor", "Went cold", "Other"]'::jsonb,
  -- BDT per 1 unit of each foreign currency
  ADD COLUMN IF NOT EXISTS fx_rates JSONB DEFAULT '{"USD": 120, "AUD": 80, "EUR": 130}'::jsonb,
  ADD COLUMN IF NOT EXISTS fx_rates_updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS invoice_settings JSONB DEFAULT '{
    "prefix": "ML-",
    "include_year": true,
    "default_tax_rate": 0,
    "payment_terms_days": null,
    "default_gateway": "bkash",
    "footer_note": "Thank you for your business. Momentum Labz — Conversion Infrastructure."
  }'::jsonb;

-- Rows that existed before this migration get the defaults too
UPDATE system_settings SET
  company_profile = COALESCE(company_profile, '{"name":"Momentum Labz","email":"hello@momentumlabz.com","phone":"","address":"Dhaka, Bangladesh","website":"","tax_id":""}'::jsonb),
  fx_rates_updated_at = COALESCE(fx_rates_updated_at, now())
WHERE id = 1;

-- Lead sources are now configurable in Settings, so the fixed list goes
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;

-- ─── pipeline_stages integrity ───────────────────────────────
DO $$ BEGIN
  ALTER TABLE pipeline_stages ADD CONSTRAINT pipeline_stages_won_lost_exclusive
    CHECK (NOT (COALESCE(is_won, false) AND COALESCE(is_lost, false)));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Leads reference stages by name, so two stages must never share one
CREATE UNIQUE INDEX IF NOT EXISTS pipeline_stages_name_unique ON pipeline_stages (lower(name));

-- Stage renames must not be recorded as lead stage changes
CREATE OR REPLACE FUNCTION log_lead_stage_change()
RETURNS trigger AS $$
BEGIN
  IF current_setting('app.stage_rename', true) = 'on' THEN
    RETURN new;
  END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lead_stage_history (lead_id, from_stage, to_stage)
    VALUES (new.id, null, new.stage);
  ELSIF new.stage IS DISTINCT FROM old.stage THEN
    INSERT INTO lead_stage_history (lead_id, from_stage, to_stage)
    VALUES (new.id, old.stage, new.stage);
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Renaming a stage carries its leads and history over to the new name
CREATE OR REPLACE FUNCTION sync_stage_rename()
RETURNS trigger AS $$
BEGIN
  IF new.name IS DISTINCT FROM old.name THEN
    PERFORM set_config('app.stage_rename', 'on', true);
    UPDATE leads SET stage = new.name WHERE stage = old.name;
    UPDATE lead_stage_history SET to_stage = new.name WHERE to_stage = old.name;
    UPDATE lead_stage_history SET from_stage = new.name WHERE from_stage = old.name;
    PERFORM set_config('app.stage_rename', 'off', true);
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_stage_rename ON pipeline_stages;
CREATE TRIGGER trg_sync_stage_rename
  AFTER UPDATE OF name ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION sync_stage_rename();

CREATE OR REPLACE FUNCTION reorder_pipeline_stages(p_ids uuid[])
RETURNS void AS $$
  UPDATE pipeline_stages s
  SET sort_order = t.ord
  FROM unnest(p_ids) WITH ORDINALITY AS t(id, ord)
  WHERE s.id = t.id;
$$ LANGUAGE sql;

-- Deletes a stage; if leads are in it they must be moved to another stage first
CREATE OR REPLACE FUNCTION delete_pipeline_stage(p_stage_id uuid, p_move_to text DEFAULT NULL)
RETURNS integer AS $$
DECLARE
  v_name text;
  v_count integer;
BEGIN
  SELECT name INTO v_name FROM pipeline_stages WHERE id = p_stage_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Stage not found';
  END IF;

  SELECT count(*) INTO v_count FROM leads WHERE stage = v_name;
  IF v_count > 0 THEN
    IF p_move_to IS NULL THEN
      RAISE EXCEPTION 'This stage has % lead(s). Choose a stage to move them to.', v_count;
    END IF;
    IF p_move_to = v_name OR NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE name = p_move_to) THEN
      RAISE EXCEPTION 'Choose a different, existing stage to move the leads to.';
    END IF;
    UPDATE leads SET stage = p_move_to WHERE stage = v_name;
  END IF;

  DELETE FROM pipeline_stages WHERE id = p_stage_id;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Renames a service everywhere it is stored by name
CREATE OR REPLACE FUNCTION rename_service(p_old text, p_new text)
RETURNS void AS $$
BEGIN
  IF p_new IS NULL OR trim(p_new) = '' THEN
    RAISE EXCEPTION 'Service name cannot be empty';
  END IF;
  IF EXISTS (
    SELECT 1 FROM system_settings, unnest(services) AS s
    WHERE id = 1 AND lower(s) = lower(trim(p_new)) AND s <> p_old
  ) THEN
    RAISE EXCEPTION 'A service called "%" already exists', trim(p_new);
  END IF;
  UPDATE system_settings SET services = array_replace(services, p_old, trim(p_new)) WHERE id = 1;
  UPDATE leads SET services = array_replace(services, p_old, trim(p_new)) WHERE p_old = ANY(services);
  UPDATE proposals SET services = array_replace(services, p_old, trim(p_new)) WHERE p_old = ANY(services);
END;
$$ LANGUAGE plpgsql;

-- Only signed-in users may call these (RLS still applies inside them)
REVOKE EXECUTE ON FUNCTION reorder_pipeline_stages(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION delete_pipeline_stage(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION rename_service(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reorder_pipeline_stages(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_pipeline_stage(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION rename_service(text, text) TO authenticated;
