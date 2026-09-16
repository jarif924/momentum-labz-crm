const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  for (const row of tables.rows) {
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [row.table_name]);
    console.log(`\n=== Table: ${row.table_name} ===`);
    console.log(cols.rows.map(c => `  - ${c.column_name} (${c.data_type})`).join('\n'));
  }
  
  await client.end();
}
run();
