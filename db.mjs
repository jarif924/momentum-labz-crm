import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://postgres.mjvpdvopcxpthultrjpf:kirekikhbr%40%40%24%24924@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
});

async function run() {
  await client.connect();
  console.log('Connected to DB!');
  const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
  await client.query(schema);
  console.log('Schema pushed!');
  const seed = fs.readFileSync('supabase/seed.sql', 'utf8');
  await client.query(seed);
  console.log('Seed data pushed!');
  await client.end();
}
run().catch(console.error);
