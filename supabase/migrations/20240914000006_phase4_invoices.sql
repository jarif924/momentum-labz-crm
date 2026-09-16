-- ─── types ───────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE payment_gateway_type AS ENUM ('stripe', 'bkash', 'nagad', 'bank_transfer', 'cash');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status_type AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invoice_type_type AS ENUM ('one-time', 'recurring');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ─── invoices ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BDT',
    type invoice_type_type NOT NULL DEFAULT 'one-time',
    status invoice_status_type NOT NULL DEFAULT 'draft',
    gateway payment_gateway_type,
    payment_reference TEXT,
    due_date DATE,
    paid_at TIMESTAMPTZ
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "authenticated_all" ON invoices FOR ALL USING (auth.uid() IS NOT NULL);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
