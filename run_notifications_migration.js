const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();

  console.log('Running Notifications Schema Migration...');

  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT now(),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      is_read BOOLEAN DEFAULT false,
      link TEXT,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ notifications table created');

  await client.query(`ALTER TABLE notifications ENABLE ROW LEVEL SECURITY`);
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='authenticated_all'
      ) THEN
        CREATE POLICY authenticated_all ON notifications FOR ALL USING (auth.uid() IS NOT NULL);
      END IF;
    END $$
  `);
  console.log('✓ RLS enabled on notifications');

  await client.end();
  console.log('\n✅ Migration complete!');
}
run().catch(console.error);
