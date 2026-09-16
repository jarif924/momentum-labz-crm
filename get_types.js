const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  const res = await client.query(`
    SELECT udt_name 
    FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'status'
  `);
  console.log(res.rows);
  const enums = await client.query(`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = '${res.rows[0].udt_name}'
    ORDER BY e.enumsortorder;
  `);
  console.log(enums.rows);
  await client.end();
}
run();
