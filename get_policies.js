const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  const res = await client.query("SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'projects'");
  console.log(res.rows);
  await client.end();
}
run();
