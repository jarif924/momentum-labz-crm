-- Supabase grants EXECUTE on new public functions to anon directly (not via
-- PUBLIC), so revoking from PUBLIC alone left these callable by signed-out users.
REVOKE EXECUTE ON FUNCTION reorder_pipeline_stages(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION delete_pipeline_stage(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION rename_service(text, text) FROM anon;
