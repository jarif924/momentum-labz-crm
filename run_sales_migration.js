const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();

  console.log('Running Sales Features Schema Migration...');

  // 1. Add next action fields to leads
  await client.query(`
    ALTER TABLE leads 
    ADD COLUMN IF NOT EXISTS next_action_type TEXT,
    ADD COLUMN IF NOT EXISTS next_action_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_action_notes TEXT
  `);
  console.log('✓ added next action fields to leads');

  // 2. Add activity type to activities if missing
  await client.query(`
    ALTER TABLE activities 
    ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT 'note'
  `);
  console.log('✓ added activity_type to activities');

  await client.end();
  console.log('\n✅ Migration complete!');
}
run().catch(console.error);
