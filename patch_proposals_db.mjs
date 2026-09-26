import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  await client.query("ALTER TABLE proposals ADD COLUMN IF NOT EXISTS notes text;");
  console.log('Added notes to proposals!');
  await client.end();
}
run().catch(console.error);
