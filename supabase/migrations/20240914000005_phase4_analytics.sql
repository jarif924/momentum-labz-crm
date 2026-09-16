create table if not exists lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references users(id)
);

create index if not exists lead_stage_history_lead_idx on lead_stage_history (lead_id, changed_at);

alter table lead_stage_history enable row level security;

create policy "Enable all for authenticated users on lead_stage_history"
on lead_stage_history for all to authenticated using (true) with check (true);

create or replace function log_lead_stage_change()
returns trigger as $$ 
begin
  if TG_OP = 'INSERT' then
    insert into lead_stage_history (lead_id, from_stage, to_stage)
    values (new.id, null, new.stage);
    return new;
  elsif new.stage is distinct from old.stage then
    insert into lead_stage_history (lead_id, from_stage, to_stage)
    values (new.id, old.stage, new.stage);
    return new;
  end if;
  return new;
end; 
$$ language plpgsql;

drop trigger if exists trg_lead_stage_history on leads;

create trigger trg_lead_stage_history
after insert or update on leads
for each row execute function log_lead_stage_change();

-- Seed existing leads
insert into lead_stage_history (lead_id, from_stage, to_stage, changed_at)
select id, null, stage, now()
from leads
where not exists (
  select 1 from lead_stage_history where lead_id = leads.id
);
