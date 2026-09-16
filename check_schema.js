const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log('=== TABLES ===');
  console.log(tables.rows.map(r => r.table_name));
  
  // Check invoices schema
  const invoiceCols = await client.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'invoices'
    ORDER BY ordinal_position
  `);
  console.log('\n=== INVOICES COLUMNS ===');
  console.log(invoiceCols.rows);
  
  // Check proposals schema
  const propCols = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'proposals'
    ORDER BY ordinal_position
  `);
  console.log('\n=== PROPOSALS COLUMNS ===');
  console.log(propCols.rows);
  
  await client.end();
}
run();
