const { Client } = require('pg');

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    await client.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT 'feature';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS dri_name VARCHAR(255);
      
      CREATE TABLE IF NOT EXISTS task_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
        author_name VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        is_blocker BOOLEAN DEFAULT FALSE,
        is_decision BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Successfully patched tasks DB schema for internal PM.');
  } catch(e) {
    console.error('Migration failed:', e);
  } finally {
    await client.end();
  }
}
migrate();
