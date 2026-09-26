import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
async function run() {
  await client.connect();
  console.log('Connected to DB! Testing Step 5 (Contacts & Companies)...');
  
  // 1. Create a Company
  const compRes = await client.query(`INSERT INTO companies (name, region, website) VALUES ('Acme Corp', 'international', 'https://acme.com') RETURNING id`);
  const compId = compRes.rows[0].id;
  console.log('Created company:', compId);
  
  // 2. Create Contact linked to Company
  const contactRes = await client.query(`INSERT INTO contacts (full_name, company_id, email, is_client) VALUES ('Jane Doe', $1, 'jane@acme.com', false) RETURNING id`, [compId]);
  const contactId = contactRes.rows[0].id;
  console.log('Created contact:', contactId);
  
  // 3. Edit Contact
  await client.query(`UPDATE contacts SET is_client = true WHERE id = $1`, [contactId]);
  console.log('Edited contact to be a client');
  
  // 4. Delete Contact & Company
  await client.query(`DELETE FROM contacts WHERE id = $1`, [contactId]);
  await client.query(`DELETE FROM companies WHERE id = $1`, [compId]);
  console.log('Deleted contact and company!');
  
  await client.end();
  console.log('Step 5 CRUD verified!');
}
run().catch(console.error);
