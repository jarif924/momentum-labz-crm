const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
for (const line of env.split('\n')) {
  if (line.startsWith('DATABASE_URL=') && !line.startsWith('#')) {
    dbUrl = line.split('=')[1].replace(/"/g, '').trim();
  }
}
async function run() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const tables = ['invoices', 'tasks', 'leads', 'pipeline_stages', 'projects', 'users', 'profiles'];
  for (const table of tables) {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table]);
    console.log(`\n=== ${table} ===`);
    console.log(res.rows.map(r => `${r.column_name}: ${r.data_type}`).join('\n'));
  }
  await client.end();
}
run();
