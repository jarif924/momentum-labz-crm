const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  
  // Check enum types available
  const enums = await client.query(`
    SELECT typname, array_agg(enumlabel ORDER BY enumsortorder) as labels
    FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE typname IN ('invoice_type_type','invoice_status_type','payment_gateway_type')
    GROUP BY typname
  `);
  console.log('=== ENUM TYPES ===');
  console.log(enums.rows);
  
  // Check if expenses table exists
  const expenses = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'expenses'
    ) as exists
  `);
  console.log('\n=== EXPENSES TABLE EXISTS ===', expenses.rows[0].exists);
  
  // Check proposals - does it have valid_until, line_items, notes?
  const propCols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'proposals' ORDER BY ordinal_position
  `);
  console.log('\n=== PROPOSALS FULL COLUMNS ===');
  console.log(propCols.rows.map(r => r.column_name));
  
  // Check invoices - does it have line_items, notes, discount, tax?
  const invCols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'invoices' ORDER BY ordinal_position
  `);
  console.log('\n=== INVOICES FULL COLUMNS ===');
  console.log(invCols.rows.map(r => r.column_name));
  
  await client.end();
}
run();
