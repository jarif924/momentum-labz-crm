const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  
  const stages = await client.query(`SELECT * FROM pipeline_stages ORDER BY sort_order`);
  console.log('=== PIPELINE STAGES ===');
  console.log(stages.rows);
  
  // Check what stage values are in leads
  const stageValues = await client.query(`SELECT DISTINCT stage FROM leads`);
  console.log('\n=== DISTINCT STAGE VALUES IN LEADS ===');
  console.log(stageValues.rows);
  
  await client.end();
}
run();
