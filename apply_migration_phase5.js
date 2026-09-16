const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.mjvpdvopcxpthultrjpf:kirekikhbr@@$$924@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    
    const sql = fs.readFileSync('supabase/migrations/20240914000007_phase5_webhooks.sql', 'utf8');
    await client.query(sql);
    console.log('Migration 20240914000007_phase5_webhooks.sql applied successfully.');
    
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await client.end();
  }
}

run();
