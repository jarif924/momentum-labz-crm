import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgresql://postgres:kirekikhbr%40%40%24%24924@db.mjvpdvopcxpthultrjpf.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    
    // Add system settings table for services and currency defaults
    const sql = `
      create table if not exists system_settings (
        id int primary key default 1 check (id = 1),
        services text[] default array['Tech Solutions', 'Web Development', 'Marketing'],
        currency_mapping jsonb default '{"bangladesh":"BDT", "international":"USD"}'::jsonb
      );
      
      alter table system_settings enable row level security;
      create policy "authenticated_all" on system_settings for all using (auth.uid() is not null);
      
      insert into system_settings (id) values (1) on conflict (id) do nothing;
    `;
    
    await client.query(sql);
    console.log('✅ system_settings table added');
  } catch (err) {
    console.error('❌ UPDATE FAILED:', err);
  } finally {
    await client.end();
  }
}

run();
