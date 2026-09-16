-- Add custom fields schema to system settings
alter table system_settings add column lead_custom_fields jsonb default '[
  {"id": "meta_ads", "name": "Running meta ads", "type": "text"},
  {"id": "niche", "name": "Niche", "type": "text"},
  {"id": "demo_status", "name": "Demo Status", "type": "text"},
  {"id": "link", "name": "Link", "type": "text"}
]'::jsonb;

-- Add custom fields data to leads
alter table leads add column custom_fields jsonb default '{}'::jsonb;
