-- ============================================================
-- Momentum Labz CRM — Database Schema
-- Source: MomentumLabz_CRM_Implementation_Plan.md § 5
-- ============================================================
-- Run this entire file in the Supabase SQL Editor.
-- After running schema, run seed.sql to insert default pipeline stages.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── users ────────────────────────────────────────────────────
-- CRM team members. id mirrors auth.users.id for RLS.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique not null,
  role text check (role in ('owner','admin','sales','viewer')) default 'owner',
  created_at timestamptz default now()
);

-- ─── companies ────────────────────────────────────────────────
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text check (region in ('bangladesh','international')),
  country text,
  website text,
  created_at timestamptz default now()
);

-- ─── contacts ────────────────────────────────────────────────
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  whatsapp text,
  instagram_handle text,
  is_client boolean default false,
  created_at timestamptz default now()
);

-- ─── pipeline_stages ──────────────────────────────────────────
-- Stores the 9 default stages (seeded in seed.sql) + any custom ones.
create table if not exists pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null,
  is_won boolean default false,
  is_lost boolean default false
);

-- ─── leads ────────────────────────────────────────────────────
-- Core entity. services[] mirrors Section 3.2 multi-select.
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) not null,
  company_id uuid references companies(id) on delete set null,
  services text[] not null,
  region text check (region in ('bangladesh','international')) not null,
  preferred_channel text check (preferred_channel in ('whatsapp','email','instagram_dm','call')),
  source text check (source in ('meta_ad_library_scan','instagram_dm','referral','inbound_form','cold_outreach','other')),
  stage text not null default 'prospect_found',
  deal_value numeric,
  currency text check (currency in ('BDT','USD','AUD')),
  demo_url text,
  proposal_url text,
  lost_reason text,
  assigned_to uuid references users(id) on delete set null,
  next_follow_up_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update updated_at on leads
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on leads
  for each row
  execute procedure update_updated_at_column();

-- ─── activities ────────────────────────────────────────────────
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade not null,
  channel text check (channel in ('whatsapp','email','instagram_dm','call','meeting','note','system')),
  direction text check (direction in ('outbound','inbound')),
  summary text not null,
  logged_by uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

-- ─── tasks ────────────────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  title text not null,
  due_at timestamptz not null,
  completed boolean default false,
  assigned_to uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

-- ─── proposals ────────────────────────────────────────────────
create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade not null,
  amount numeric not null,
  currency text not null,
  services text[] not null,
  status text check (status in ('draft','sent','accepted','rejected')) default 'draft',
  document_url text,
  created_at timestamptz default now()
);

-- ─── tags ────────────────────────────────────────────────────
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

-- ─── lead_tags (junction) ────────────────────────────────────
create table if not exists lead_tags (
  lead_id uuid references leads(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (lead_id, tag_id)
);

-- ============================================================
-- Row Level Security
-- Phase 0 policy: authenticated users can do everything.
-- Tighten per-role in Phase 3 when you add team members.
-- ============================================================

alter table users          enable row level security;
alter table companies      enable row level security;
alter table contacts       enable row level security;
alter table leads          enable row level security;
alter table pipeline_stages enable row level security;
alter table activities     enable row level security;
alter table tasks          enable row level security;
alter table proposals      enable row level security;
alter table tags           enable row level security;
alter table lead_tags      enable row level security;

-- Authenticated owner can do everything (v1 — solo user)
create policy "authenticated_all" on users          for all using (auth.uid() is not null);
create policy "authenticated_all" on companies      for all using (auth.uid() is not null);
create policy "authenticated_all" on contacts       for all using (auth.uid() is not null);
create policy "authenticated_all" on leads          for all using (auth.uid() is not null);
create policy "authenticated_all" on pipeline_stages for all using (auth.uid() is not null);
create policy "authenticated_all" on activities     for all using (auth.uid() is not null);
create policy "authenticated_all" on tasks          for all using (auth.uid() is not null);
create policy "authenticated_all" on proposals      for all using (auth.uid() is not null);
create policy "authenticated_all" on tags           for all using (auth.uid() is not null);
create policy "authenticated_all" on lead_tags      for all using (auth.uid() is not null);

-- ─── system_settings ─────────────────────────────────────────
create table if not exists system_settings (
  id int primary key default 1 check (id = 1),
  services text[] default array['Tech Solutions', 'Web Development', 'Marketing'],
  currency_mapping jsonb default '{"bangladesh":"BDT", "international":"USD"}'::jsonb
);

alter table system_settings enable row level security;
create policy "authenticated_all" on system_settings for all using (auth.uid() is not null);
insert into system_settings (id) values (1) on conflict (id) do nothing;
