import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  console.log('Connected to DB for Phase 6!');
  const sql = fs.readFileSync('supabase/migrations/20240916000000_phase6_features.sql', 'utf8');
  await client.query(sql);
  console.log('Phase 6 migration pushed successfully!');
  await client.end();
}
run().catch(console.error);
