const { Client } = require('pg');

async function migrate() {
  const client = new Client({ connectionString: "postgresql://postgres.mjvpdvopcxpthultrjpf:kirekikhbr%40%40%24%24924@aws-0-ap-south-1.pooler.supabase.com:6543/postgres" });
  await client.connect();
  
  try {
    await client.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS loom_url TEXT;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_ad_spend NUMERIC DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS leads_generated INTEGER DEFAULT 0;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS est_roi_value NUMERIC DEFAULT 0;
    `);
    console.log('Successfully patched portal DB schema.');
  } catch(e) {
    console.error('Migration failed:', e);
  } finally {
    await client.end();
  }
}
migrate();
