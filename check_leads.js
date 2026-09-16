const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  
  // Check raw leads
  const leads = await client.query(`
    SELECT l.id, l.stage, l.source, l.created_at, c.full_name, c.email
    FROM leads l
    LEFT JOIN contacts c ON l.contact_id = c.id
    ORDER BY l.created_at DESC
    LIMIT 10
  `);
  console.log('=== LEADS IN DB ===');
  console.log(leads.rows);
  
  // Check RLS policies on leads table
  const rls = await client.query(`
    SELECT policyname, cmd, qual 
    FROM pg_policies 
    WHERE tablename = 'leads'
  `);
  console.log('\n=== LEADS RLS POLICIES ===');
  console.log(rls.rows);
  
  await client.end();
}
run();
