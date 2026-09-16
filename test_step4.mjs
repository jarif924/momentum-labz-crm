import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: "postgresql://postgres.mjvpdvopcxpthultrjpf:kirekikhbr%40%40%24%24924@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
});
async function run() {
  await client.connect();
  console.log('Connected to DB! Testing Step 4 (Proposals)...');
  
  // 1. Create a Contact and Lead first
  const contactRes = await client.query(`INSERT INTO contacts (full_name) VALUES ('Test Contact 4') RETURNING id`);
  const contactId = contactRes.rows[0].id;
  
  const leadRes = await client.query(`INSERT INTO leads (contact_id, services, region, preferred_channel, source, stage, deal_value, currency) VALUES ($1, $2, 'international', 'email', 'cold_outreach', 'Proposal Sent', 1500, 'USD') RETURNING id`, [contactId, ['Web Development']]);
  const leadId = leadRes.rows[0].id;
  
  // 2. Create Proposal
  const propRes = await client.query(`INSERT INTO proposals (lead_id, amount, currency, services, status) VALUES ($1, 2000, 'USD', $2, 'draft') RETURNING id`, [leadId, ['Web Development']]);
  const propId = propRes.rows[0].id;
  console.log('Created proposal:', propId);
  
  // 3. Edit Proposal
  await client.query(`UPDATE proposals SET status = 'sent' WHERE id = $1`, [propId]);
  console.log('Marked proposal as sent');
  
  // 4. Delete Proposal
  await client.query(`DELETE FROM proposals WHERE id = $1`, [propId]);
  console.log('Deleted proposal!');
  
  // Cleanup
  await client.query(`DELETE FROM leads WHERE id = $1`, [leadId]);
  await client.query(`DELETE FROM contacts WHERE id = $1`, [contactId]);
  
  await client.end();
  console.log('Step 4 CRUD verified!');
}
run().catch(console.error);
