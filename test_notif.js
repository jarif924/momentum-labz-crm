const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();

  await client.query(`
    INSERT INTO notifications (title, message, type, link)
    VALUES ('Welcome to Phase 7!', 'The final gaps have been closed. Analytics, Settings, Notifications, and E-Signatures are live.', 'success', '/analytics')
  `);
  
  await client.end();
  console.log('Test notification sent!');
}
run();
