const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'projects'");
  console.log('--- projects ---');
  console.log(res.rows);
  const tasks = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks'");
  console.log('--- tasks ---');
  console.log(tasks.rows);
  const inv = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices'");
  console.log('--- invoices ---');
  console.log(inv.rows);
  await client.end();
}
run();
