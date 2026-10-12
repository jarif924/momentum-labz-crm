# Phase 5: Proactive Intelligence & Automation Migration Plan

## 1. Retainer Auto-Invoicing
**Implementation Details:**
- We will extend the existing Vercel cron job (or add a new endpoint specifically for billing).
- On the 1st of each month, the cron will query all active projects where `service_line` (or billing model) indicates a retainer.
- It will generate `DRAFT` invoices for each. 
- **Duplicate Guard:** Before inserting, we will query the `invoices` table to ensure an invoice for that specific `project_id` covering the current month/year does not already exist.

## 2. Reminders That Actually Deliver
**Implementation Details:**
- Both **Resend** (for email) and **WhatsApp SDK** have been approved for use.
- We will expand the cron job that handles notifications to execute real delivery mechanisms.
- **Rules:**
  - Check client country/preferences: If Bangladeshi, use WhatsApp; otherwise, use Resend Email.
- **Triggers:**
  - **Overdue Invoice:** When `due_date < now()` and `status != 'paid'`.
  - **Stale Lead (7 days):** When `status = 'new'` (or similar active stage) and `updated_at < now() - interval '7 days'`.
  - **Task Overdue:** When `due_date < now()` and `status != 'done'`.
  - **Approval Pending (> 48h):** When a milestone is awaiting client approval and `updated_at < now() - interval '48 hours'`.

## 3. New Lead Alert
**Implementation Details:**
- We will replace the `console.log` stub in `/api/leads/ingest`.
- Using the approved WhatsApp SDK (and/or a simple Slack Webhook), we will fire an alert to the Admin/Sales team.
- The alert payload will be formatted to include:
  - Lead Score
  - Budget Tier
  - Source

## 4. Weekly Digest (Monday Morning)
**Implementation Details:**
- Add a new Vercel cron endpoint configured to run every Monday at 8 AM.
- **Team Member Payload:** Queries `tasks` for the individual, returning this week's assignments and any currently overdue items. Delivered via Resend.
- **Admin Payload:** Queries system-wide metrics: 
  - New leads, won/lost counts.
  - Cash collected this week.
  - Outstanding balances (grouped by currency).
  - Projects at risk (based on overdue tasks or budget overruns).
  - Team workload (utilisation snapshot).
  Delivered via Resend.

## 5. Real Reports (Analytics Dashboard)
**UI Implementation:**
- Expand the current Analytics page (which only reads leads/pipeline stages) using `recharts` to add:
  - **Revenue by Service Line:** Aggregate invoiced amounts.
  - **Profit by Client:** `(Invoiced - Expenses - Labour Cost)` grouped by Client.
  - **Utilisation by Person:** Reuse logic from Phase 3, plotted over time.
  - **Pipeline Velocity:** Average time a lead spends in each stage.
- **Strict Currency Rule:** All financial charts will have a currency toggle or separate charts per currency. No mixed summations.

## 6. FX Rates in Settings
**Schema Updates:**
- Create an `app_settings` table to store key-value configuration, specifically `fx_rates`.
- Seed it with the current defaults: `{"USD": 120, "AUD": 80, "EUR": 130, "BDT": 1}`.

**UI Implementation:**
- Add an "FX Rates" tab to the Settings Hub (Admin only).
- Let Admins edit the rates directly and display the `updated_at` timestamp.
- **Leads Kanban Update:** Refactor the Kanban board to fetch the `fx_rates` from the database instead of the hardcoded object.
- Append a subtle UI note next to any BDT-converted total: *"Converted at [Rate] (Last updated: [timestamp])"* to ensure no one trusts a stale number.

---

# Migration SQL Script

```sql
-- 6. FX RATES SETTINGS
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
-- Everyone can read settings (needed for Leads Kanban conversion)
CREATE POLICY "Everyone_Read_Settings" ON app_settings FOR SELECT USING (auth.uid() IS NOT NULL);
-- Only Admins can update settings
CREATE POLICY "Admin_Update_Settings" ON app_settings FOR ALL USING (get_user_role() = 'admin');

-- Seed initial rates
INSERT INTO app_settings (key, value) 
VALUES ('fx_rates', '{"USD": 120, "AUD": 80, "EUR": 130, "BDT": 1}'::jsonb)
ON CONFLICT (key) DO NOTHING;
```
