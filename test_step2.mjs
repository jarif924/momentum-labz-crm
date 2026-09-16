import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: "postgresql://postgres.mjvpdvopcxpthultrjpf:kirekikhbr%40%40%24%24924@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
});
async function run() {
  await client.connect();
  console.log('Connected to DB! Testing Step 2 (Leads)...');
  
  // 1. Create a Contact first
  const contactRes = await client.query(`INSERT INTO contacts (full_name) VALUES ('Test Contact') RETURNING id`);
  const contactId = contactRes.rows[0].id;
  console.log('Created contact:', contactId);
  
  // 2. Create Lead
  const leadRes = await client.query(`INSERT INTO leads (contact_id, services, region, preferred_channel, source, stage, deal_value, currency) VALUES ($1, $2, 'international', 'email', 'cold_outreach', 'Prospect Found', 1500, 'USD') RETURNING id`, [contactId, ['Web Development']]);
  const leadId = leadRes.rows[0].id;
  console.log('Created lead:', leadId);
  
  // 3. Edit Lead
  await client.query(`UPDATE leads SET stage = 'Won', deal_value = 2000 WHERE id = $1`, [leadId]);
  console.log('Edited lead to Won');
  
  // 4. Delete Lead
  await client.query(`DELETE FROM leads WHERE id = $1`, [leadId]);
  console.log('Deleted lead!');
  
  // Cleanup
  await client.query(`DELETE FROM contacts WHERE id = $1`, [contactId]);
  
  await client.end();
  console.log('Step 2 CRUD verified!');
}
run().catch(console.error);
