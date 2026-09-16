const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  const res = await client.query(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname IN ('project_status', 'service_line_type')
    ORDER BY t.typname, e.enumsortorder;
  `);
  console.log(res.rows);
  await client.end();
}
run();
