const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();

  console.log('Running Finance Schema Migration...');

  // 1. Add line_items, tax_rate, discount, notes to invoices
  await client.query(`
    ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS retainer_month DATE,
      ADD COLUMN IF NOT EXISTS is_retainer BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS partial_paid NUMERIC DEFAULT 0
  `);
  console.log('✓ invoices table upgraded');

  // 2. Upgrade proposals table
  await client.query(`
    ALTER TABLE proposals
      ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS valid_until DATE,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ
  `);
  console.log('✓ proposals table upgraded');

  // 3. Create expenses table
  await client.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT now(),
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      description TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      currency TEXT NOT NULL DEFAULT 'BDT',
      category TEXT NOT NULL DEFAULT 'tools',
      lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      vendor TEXT,
      payment_method TEXT DEFAULT 'bkash',
      receipt_url TEXT,
      notes TEXT,
      is_billable BOOLEAN DEFAULT false,
      is_billed BOOLEAN DEFAULT false
    )
  `);
  console.log('✓ expenses table created');

  // 4. Enable RLS on expenses with same pattern as other tables
  await client.query(`ALTER TABLE expenses ENABLE ROW LEVEL SECURITY`);
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename='expenses' AND policyname='authenticated_all'
      ) THEN
        CREATE POLICY authenticated_all ON expenses FOR ALL USING (auth.uid() IS NOT NULL);
      END IF;
    END $$
  `);
  console.log('✓ RLS enabled on expenses');

  await client.end();
  console.log('\n✅ Finance migration complete!');
}
run().catch(console.error);
