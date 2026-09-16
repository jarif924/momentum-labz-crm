import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: "postgresql://postgres.mjvpdvopcxpthultrjpf:kirekikhbr%40%40%24%24924@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
});
async function run() {
  await client.connect();
  console.log('Connected to DB! Testing Step 6 (Clients)...');
  
  // 1. Create a Contact marked as Client
  const contactRes = await client.query(`INSERT INTO contacts (full_name, is_client, email) VALUES ('Client Bob', true, 'bob@example.com') RETURNING id`);
  const contactId = contactRes.rows[0].id;
  console.log('Created client:', contactId);
  
  // 2. Fetch clients to verify
  const fetchRes = await client.query(`SELECT full_name FROM contacts WHERE is_client = true AND id = $1`, [contactId]);
  if (fetchRes.rows.length === 1 && fetchRes.rows[0].full_name === 'Client Bob') {
    console.log('Verified client fetch');
  } else {
    throw new Error('Client fetch failed');
  }

  // 3. Delete Contact
  await client.query(`DELETE FROM contacts WHERE id = $1`, [contactId]);
  console.log('Deleted client!');
  
  await client.end();
  console.log('Step 6 CRUD verified!');
}
run().catch(console.error);
