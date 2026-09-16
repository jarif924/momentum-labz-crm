const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  
  // Fix all leads that have the wrong stage name
  const result = await client.query(`
    UPDATE leads 
    SET stage = 'Prospect Found' 
    WHERE stage = 'prospect_found'
    RETURNING id
  `);
  console.log(`Fixed ${result.rows.length} leads — updated stage to "Prospect Found"`);
  
  await client.end();
}
run();
