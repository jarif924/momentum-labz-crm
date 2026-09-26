import pg from 'pg';
const { Client } = pg;
const DB = process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL not set'); process.exit(1); }
const client = new Client({ connectionString: DB });
await client.connect();
const { rows: tables } = await client.query(`
  SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename
`);
console.log('TABLES:', tables.map(r=>r.tablename).join(', '));
const { rows: rls } = await client.query(`
  SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename
`);
console.log('\nRLS STATUS:');
rls.forEach(r => console.log(` ${r.tablename}: RLS=${r.rowsecurity}`));
const { rows: policies } = await client.query(`
  SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' ORDER BY tablename
`);
console.log('\nPOLICIES:');
policies.forEach(r => console.log(` ${r.tablename}: ${r.policyname} (${r.cmd})`));
const { rows: users } = await client.query(`SELECT id, email FROM auth.users`);
console.log('\nAUTH USERS:', users.map(u=>u.email).join(', '));
await client.end();
