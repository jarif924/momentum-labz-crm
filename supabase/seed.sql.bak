-- ============================================================
-- Momentum Labz CRM — Seed Data
-- Run AFTER schema.sql
-- ============================================================
-- Seeds the 9 default pipeline stages from Section 3.3 of the
-- implementation plan. These match your actual outreach motion,
-- not a generic MQL/SQL funnel.
-- ============================================================

insert into pipeline_stages (name, sort_order, is_won, is_lost) values
  ('Prospect Found',  1, false, false),  -- Identified via Meta Ad Library or otherwise
  ('Demo Built',      2, false, false),  -- Unsolicited personalized demo built
  ('Outreach Sent',   3, false, false),  -- Loom + DM sent
  ('Replied / Engaged', 4, false, false), -- They responded
  ('Call Booked',     5, false, false),
  ('Proposal Sent',   6, false, false),
  ('Negotiation',     7, false, false),
  ('Won',             8, true,  false),  -- Client; triggers is_client flag on contact
  ('Lost',            9, false, true)    -- Requires lost_reason field
on conflict do nothing;
