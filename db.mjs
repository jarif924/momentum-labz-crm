import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
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
